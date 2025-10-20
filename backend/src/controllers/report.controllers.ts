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


export const getReorderLevelFromItems: RequestHandler = async (req, res) => {
  try {
    // Tunables (kept simple)
    const WINDOW_DAYS = 30;         // look back N days of sales
    const DEFAULT_LEAD = 7;         // days, if we can't compute from POs
    const SAFETY_F = 0.2;           // 20% safety stock
    const limit = Number(req.query.limit ?? 0); // optional ?limit=10

    // Time window for sales
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - WINDOW_DAYS);

    // 1) Active products
    const { data: products, error: prodErr } = await supabase
      .from("Product")
      .select("ProductID, Name, IsActive")
      .eq("IsActive", true);

    if (prodErr) return res.status(500).json({ error: prodErr.message });

    // 2) Current stock per product (active Product_Item rows)
    const { data: items, error: itemErr } = await supabase
      .from("Product_Item")
      .select("ProductID, Stock, IsActive")
      .eq("IsActive", true);

    if (itemErr) return res.status(500).json({ error: itemErr.message });

    const stockTotals: Record<string, number> = {};
    for (const row of items ?? []) {
      const pid = row.ProductID;
      const qty = Number(row.Stock) || 0;
      stockTotals[pid] = (stockTotals[pid] || 0) + qty;
    }

    // 3) Average daily usage from last WINDOW_DAYS
    //    We join Transaction_Item -> Transaction to read OrderDateTime
    const { data: txItems, error: txErr } = await supabase
      .from("Transaction_Item")
      .select(`
        ProductID,
        Quantity,
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (txErr) return res.status(500).json({ error: txErr.message });

    const usageTotals: Record<string, number> = {};
    for (const r of (txItems as any) ?? []) {
      const whenStr = r?.Transaction?.OrderDateTime as string | undefined;
      if (!whenStr) continue;
      const when = new Date(whenStr);
      if (isNaN(when.getTime())) continue;
      if (when < from || when > now) continue; // only within window

      const pid = r.ProductID as string;
      const qty = Number(r.Quantity) || 0;
      usageTotals[pid] = (usageTotals[pid] || 0) + qty;
    }

    const avgDaily: Record<string, number> = {};
    const divisor = Math.max(WINDOW_DAYS, 1);
    for (const pid of Object.keys(usageTotals)) {
      avgDaily[pid] = usageTotals[pid] / divisor; // units/day
    }

    // 4) Lead time from delivered Purchase Orders
    const { data: pos, error: poErr } = await supabase
      .from("Purchase_Order")
      .select("ProductID, OrderPlacedDateTime, OrderArrivalDateTime")
      .not("OrderPlacedDateTime", "is", null)
      .not("OrderArrivalDateTime", "is", null);

    if (poErr) return res.status(500).json({ error: poErr.message });

    const leadSum: Record<string, number> = {};
    const leadCnt: Record<string, number> = {};
    for (const po of pos ?? []) {
      const placed = new Date(po.OrderPlacedDateTime as any);
      const arrived = new Date(po.OrderArrivalDateTime as any);
      if (isNaN(placed.getTime()) || isNaN(arrived.getTime())) continue;

      const days = (arrived.getTime() - placed.getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 0) continue;

      const pid = po.ProductID as string;
      leadSum[pid] = (leadSum[pid] || 0) + days;
      leadCnt[pid] = (leadCnt[pid] || 0) + 1;
    }

    const leadDays: Record<string, number> = {};
    for (const pid of Object.keys(leadSum)) {
      leadDays[pid] = leadSum[pid] / Math.max(leadCnt[pid], 1);
    }

    // 5) Compute per product and return LOW STOCK only
    const results = (products ?? []).map((p) => {
      const pid = p.ProductID as string;
      const totalStock   = stockTotals[pid] || 0;
      const avgUsage     = avgDaily[pid] || 0;                 // units/day
      const lead         = leadDays[pid] || DEFAULT_LEAD;      // days
      const safetyStock  = SAFETY_F * avgUsage * lead;         // 20% buffer
      const reorderLevel = avgUsage * lead + safetyStock;      // final ROL

      const reorderQty = Math.max(reorderLevel - totalStock + safetyStock, 0);
      return {
        productId: pid,
        name: p.Name as string,
        totalStock,
        avgDailyUsage: +avgUsage.toFixed(2),
        leadTimeDays:  +lead.toFixed(2),
        safetyStock:   Math.round(safetyStock),
        reorderLevel:  Math.round(reorderLevel),
        reorderQuantity: Math.round(reorderQty), 
        status: totalStock <= reorderLevel ? "LOW STOCK" : "OK",
      };
    });

    let lowStock = results.filter((r) => r.status === "LOW STOCK");

    // Optional limit (?limit=10)
    if (limit > 0) {
      lowStock = lowStock.slice(0, limit);
    }

    // Return ONLY lowStock (array)
    return res.json(lowStock);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err?.message || "Something went wrong" });
  }
};