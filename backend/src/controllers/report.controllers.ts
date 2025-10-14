import { RequestHandler } from "express";
import { supabase } from "../config/database";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
//Table Names
const T_TABLE = "Transaction";
const TI_TABLE= "Transaction_Item";
// Fields to select
const TransFIELDS = `TransactionID, OrderDateTime`; // we only need an ID + date
const ItemFIELDS = 
  `Quantity,
  Product:ProductID (
    ProductID,
    Name,
    Category
  ),
  Transaction:TransactionID (
    OrderDateTime
  )`; // need qty, product details, and transaction date

type TxRow = {
  TransactionID: string;
  OrderDateTime: string | null;
};

// Get monthly transaction totals
export const getMonthlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year ?? now.getFullYear());

    const start = new Date(year, 0, 1).toISOString();
    const end   = new Date(year + 1, 0, 1).toISOString();

    const { data, error } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (error) { 
        return res.status(500).json({ error: error.message });
    }
    
    const rows = (data ?? []) as TxRow[];  // data gathered to TxRow type
    const monthlyCount = new Array(12).fill(0); // index 0=Jan, 11=Dec

    for (const row of rows) {
      if (!row.OrderDateTime) continue;
      const m = new Date(row.OrderDateTime).getMonth(); // 0..11
      monthlyCount[m] += 1; // count, not sum
    }

    const series = monthlyCount.map((count, i) => ({
      month: MONTHS[i],
      totalTransactions: count,
    }));

    return res.json({ year, series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};
// Get yearly transaction totals
export const getYearlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const fromYear = Number(req.query.from ?? currentYear - 4);
    const toYear   = Number(req.query.to ?? currentYear);

    const startYear = Math.min(fromYear, toYear);
    const endYear   = Math.max(fromYear, toYear);

    const start = new Date(startYear, 0, 1).toISOString();
    const end   = new Date(endYear + 1, 0, 1).toISOString();

    const { data, error } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (error){
        return res.status(500).json({ error: error.message });
    } 

    const rows = (data ?? []) as TxRow[];

    const totals: Record<number, number> = {};
    for (let y = startYear; y <= endYear; y++) totals[y] = 0;

    for (const row of rows) {
      if (!row.OrderDateTime) continue;
      const y = new Date(row.OrderDateTime).getFullYear();
      totals[y] = (totals[y] || 0) + 1; // just count
    }

    const series = Object.keys(totals).map((y) => ({
      year: Number(y),
      totalTransactions: totals[Number(y)] || 0,
    }));

    return res.json({ series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};

// Get top 5 & 10 selling products or category
export const getTopItems: RequestHandler = async (req, res) => {
  try {
    // read choices from query
    const typeRaw  = String(req.query.type || "product").toLowerCase();
    const limitRaw = Number(req.query.limit || 5);
    const fromYear = Number(req.query.fromYear);
    const toYear   = Number(req.query.toYear);

    // default years 
    const nowY = new Date().getFullYear();
    const startYear = isNaN(fromYear) ? nowY - 1 : fromYear; // deafault to last year 
    const endYear   = isNaN(toYear)   ? nowY     : toYear;

    // clamp to 2 years max 
    const minYear = Math.min(startYear, endYear); // e.g. 2024
    const maxYear = Math.min(minYear + 1, Math.max(startYear, endYear)); // e.g. 2025

    // only allow 5 or 10
    const limit = limitRaw === 10 ? 10 : 5;

    // only allow product or category
    const type = typeRaw === "category" ? "category" : "product";

    // make ISO date range example result (2024-01-01T00:00:00.000Z to 2026-01-01T00:00:00.000Z)

    const startISO = new Date(minYear, 0, 1).toISOString();
    const endISO   = new Date(maxYear + 1, 0, 1).toISOString();

    // get transaction items with joined product + transaction date
    const { data, error } = await supabase
      .from(TI_TABLE)
      .select(ItemFIELDS);

    if (error) return res.status(500).json({ error: error.message });

    // filter by date range using the joined Transaction.OrderDateTime
    const rows = (data ?? []).filter((r: any) => {
      const when = r?.Transaction?.OrderDateTime ? new Date(r.Transaction.OrderDateTime) : null;
      if (!when || isNaN(when.getTime())) return false;
      return when >= new Date(startISO) && when < new Date(endISO);
    });

    // By PRODUCT mode
    if (type === "product") {
      //e.g Record <productId, { productId, name, category, sold }>
      const byProduct: Record <string, {
        productId: string;
        name: string;
        category: string | null;
        sold: number;
      }> = {};

      // cast to any[] to keep it simple 
      for (const { Product: p, Quantity } of rows as any[]) {
        const qty = Number(Quantity ?? 0);
        if (!p?.ProductID) continue;

        if (!byProduct[p.ProductID]) { 
          byProduct[p.ProductID] = {
            productId: p.ProductID,
            name: p.Name ?? "Unknown Product",
            category: p.Category ?? null,
            sold: 0,
          };
        }

        byProduct[p.ProductID].sold += isNaN(qty) ? 0 : qty;
      }

      const items = Object.values(byProduct)
        .sort((a, b) => b.sold - a.sold) // sort desceending
        .slice(0, limit);

      return res.json({
        type: "product",
        fromYear: minYear,
        toYear: maxYear,
        limit,
        items,
      });
    }
    else {

      // By CATEGORY mode
      const byCategory: Record<string, { category: string; sold: number }> = {};

      for (const r of rows as any[]) {
        const qty = Number(r.Quantity ?? 0);
        const cat = r?.Product?.Category ?? "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = { category: cat, sold: 0 };
        byCategory[cat].sold += isNaN(qty) ? 0 : qty;
      }

      const items = Object.values(byCategory)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, limit);

      return res.json({
        type: "category",
        fromYear: minYear,
        toYear: maxYear,
        limit,
        items,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};

export const getReorderLevelFromItems: RequestHandler = async (_req, res) => {
  try {
    // Step 1. Get product info + usage details
    const { data: products, error: pError } = await supabase
      .from("Product")
      .select("ProductID, Name, AvgDailyUsage, LeadTimeDays, SafetyStock");

    if (pError) return res.status(500).json({ error: pError.message });

    // Step 2. Get all product items (actual stock by batch)
    const { data: items, error: iError } = await supabase
      .from("Product_Item")
      .select("ProductID, Stock");

    if (iError) return res.status(500).json({ error: iError.message });

    // Step 3. Compute total stock per product
    const stockTotals: Record<string, number> = {};
    for (const i of items ?? []) {
      const pid = i.ProductID;
      const qty = Number(i.Stock) || 0;
      stockTotals[pid] = (stockTotals[pid] || 0) + qty;
    }

    // Step 4. Compute reorder level & status
    const results = (products ?? []).map((p) => {
      const totalStock = stockTotals[p.ProductID] || 0;
      const avg = Number(p.AvgDailyUsage) || 0;
      const lead = Number(p.LeadTimeDays) || 0;
      const safety = Number(p.SafetyStock) || 0;
      const reorderLevel = avg * lead + safety;

      return {
        productId: p.ProductID,
        name: p.Name,
        totalStock,
        avgDailyUsage: avg,
        leadTimeDays: lead,
        safetyStock: safety,
        reorderLevel,
        shortage: Math.max(0, reorderLevel - totalStock),
        status: totalStock < reorderLevel ? "LOW STOCK" : "OK",
      };
    });

    // Step 5. Filter low stock only (optional)
    const lowStock = results.filter((r) => r.status === "LOW STOCK");

    return res.json({
      count: lowStock.length,
      lowStock,
      allProducts: results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Something went wrong" });
  }
};

