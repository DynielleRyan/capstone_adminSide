import { RequestHandler } from "express";
import { supabase } from "../config/database";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
//Table Names
const T_TABLE = "Transaction";
const TI_TABLE= "Transaction_Item";
// Fields to select
const TransFIELDS = `TransactionID, OrderDateTime, Total`; // we only need an ID + date
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
  Total?: number | null;  
};

// Get monthly transaction totals + sales + units + best product
export const getMonthlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year ?? now.getFullYear());

    const start = new Date(year, 0, 1).toISOString();
    const end   = new Date(year + 1, 0, 1).toISOString();

    // 1️⃣ Transactions for counts + sales
    const { data: txData, error: txErr } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (txErr) {
      return res.status(500).json({ error: txErr.message });
    }

    const txRows = (txData ?? []) as TxRow[];

    // 2️⃣ Transaction items for units + best product
    const { data: itemData, error: iErr } = await supabase
      .from(TI_TABLE)
      .select(`
        Quantity,
        Product:ProductID ( Name ),
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (iErr) {
      return res.status(500).json({ error: iErr.message });
    }

    // Monthly aggregates
    const monthly = MONTHS.map(() => ({
      transactions: 0,
      sales: 0,
      units: 0,
      productQty: {} as Record<string, number>,
    }));

    // 2.1 count transactions + sales per month
    for (const row of txRows) {
      if (!row.OrderDateTime) continue;
      const d = new Date(row.OrderDateTime);
      if (d < new Date(start) || d >= new Date(end)) continue;
      const m = d.getMonth(); // 0..11
      monthly[m].transactions += 1;
      monthly[m].sales += Number(row.Total ?? 0);
    }

    // 2.2 units + per-product qty per month
    for (const r of (itemData as any[]) ?? []) {
      const tx = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
      const whenStr = tx?.OrderDateTime as string | undefined;
      if (!whenStr) continue;
      const when = new Date(whenStr);
      if (when < new Date(start) || when >= new Date(end)) continue;

      const m = when.getMonth();
      const qty = Number(r.Quantity ?? 0);
      if (isNaN(qty)) continue;

      monthly[m].units += qty;

      const name = r.Product?.Name ?? "Unknown Product";
      monthly[m].productQty[name] = (monthly[m].productQty[name] || 0) + qty;
    }

    // 3️⃣ Build final series
    const series = MONTHS.map((label, i) => {
      const agg = monthly[i];
      let bestProduct: string | null = null;
      let maxQty = 0;
      for (const [name, qty] of Object.entries(agg.productQty)) {
        if (qty > maxQty) {
          maxQty = qty;
          bestProduct = name;
        }
      }

      return {
        month: label,
        totalTransactions: agg.transactions,
        totalSales: Number(agg.sales.toFixed(2)),
        totalUnitsSold: agg.units,
        bestProduct,
      };
    });

    return res.json({ year, series });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};

// Get yearly transaction totals + sales + units + best product
export const getYearlyTransactionTotals: RequestHandler = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const fromYear = Number(req.query.from ?? currentYear - 4);
    const toYear   = Number(req.query.to ?? currentYear);

    const startYear = Math.min(fromYear, toYear);
    const endYear   = Math.max(fromYear, toYear);

    const start = new Date(startYear, 0, 1).toISOString();
    const end   = new Date(endYear + 1, 0, 1).toISOString();

    // 1️⃣ Transactions for counts + sales
    const { data: txData, error: txErr } = await supabase
      .from(T_TABLE)
      .select(TransFIELDS)
      .gte("OrderDateTime", start)
      .lt("OrderDateTime", end);

    if (txErr) {
      return res.status(500).json({ error: txErr.message });
    }

    const txRows = (txData ?? []) as TxRow[];

    // 2️⃣ Items for units + best product
    const { data: itemData, error: iErr } = await supabase
      .from(TI_TABLE)
      .select(`
        Quantity,
        Product:ProductID ( Name ),
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (iErr) {
      return res.status(500).json({ error: iErr.message });
    }

    // Yearly aggregates
    const years: number[] = [];
    const yearly: Record<number, {
      transactions: number;
      sales: number;
      units: number;
      productQty: Record<string, number>;
    }> = {};

    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
      yearly[y] = {
        transactions: 0,
        sales: 0,
        units: 0,
        productQty: {},
      };
    }

    // 2.1 transactions + sales
    for (const row of txRows) {
      if (!row.OrderDateTime) continue;
      const d = new Date(row.OrderDateTime);
      const y = d.getFullYear();
      if (y < startYear || y > endYear) continue;
      yearly[y].transactions += 1;
      yearly[y].sales += Number(row.Total ?? 0);
    }

    // 2.2 units + per-product qty per year
    for (const r of (itemData as any[]) ?? []) {
      const tx = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
      const whenStr = tx?.OrderDateTime as string | undefined;
      if (!whenStr) continue;
      const when = new Date(whenStr);
      const y = when.getFullYear();
      if (y < startYear || y > endYear) continue;

      const qty = Number(r.Quantity ?? 0);
      if (isNaN(qty)) continue;

      yearly[y].units += qty;

      const name = r.Product?.Name ?? "Unknown Product";
      yearly[y].productQty[name] = (yearly[y].productQty[name] || 0) + qty;
    }

    // 3️⃣ Build series
    const series = years.map((y) => {
      const agg = yearly[y];
      let bestProduct: string | null = null;
      let maxQty = 0;
      for (const [name, qty] of Object.entries(agg.productQty)) {
        if (qty > maxQty) {
          maxQty = qty;
          bestProduct = name;
        }
      }

      return {
        year: y,
        totalTransactions: agg.transactions,
        totalSales: Number(agg.sales.toFixed(2)),
        totalUnitsSold: agg.units,
        bestProduct,
      };
    });

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
    const threshold = Number(req.query.threshold ?? 20);

    // 1️⃣ Get all active product items (batches)
    const { data: items, error: itemErr } = await supabase
      .from("Product_Item")
      .select("ProductID, Stock, IsActive")
      .eq("IsActive", true);

    if (itemErr) return res.status(500).json({ error: itemErr.message });

    // 2️⃣ Group by product, track lowest batch stock
    const lowestBatchStock: Record<string, number> = {};

    for (const it of items ?? []) {
      const pid = it.ProductID;
      const stock = Number(it.Stock) || 0;

      if (!(pid in lowestBatchStock)) {
        lowestBatchStock[pid] = stock;
      } else {
        lowestBatchStock[pid] = Math.min(lowestBatchStock[pid], stock);
      }
    }

    // 3️⃣ Load product names
    const productIds = Object.keys(lowestBatchStock);

    const { data: products, error: prodErr } = await supabase
      .from("Product")
      .select("ProductID, Name, IsActive")
      .eq("IsActive", true)
      .in("ProductID", productIds);

    if (prodErr) return res.status(500).json({ error: prodErr.message });

    // Map for lookup
    const pMap = Object.fromEntries(
      products.map((p) => [p.ProductID, p])
    );

    // 4️⃣ Build final reorder list
    const results = productIds
      .map((pid) => {
        const lowest = lowestBatchStock[pid];
        const product = pMap[pid];

        if (!product) return null;

        const suggestedQty = Math.max(threshold - lowest, 0);

        return {
          productId: pid,
          name: product.Name,
          lowestBatchStock: lowest,
          reorderLevel: threshold,
          suggestedReorderQty: suggestedQty,
          status: lowest <= threshold ? "LOW STOCK" : "OK",
        };
      })
      .filter((r) => r && r.status === "LOW STOCK");

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
};
