import { RequestHandler } from "express";
import { supabase } from "../config/database";

/**
 * Count products whose TOTAL stock (sum of Product_Item.Stock across active rows)
 * is <= threshold (default 20).
 */
export const getLowStockCount: RequestHandler = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold ?? 20);

    const { count, error } = await supabase
      .from("Product_Item")
      .select("*", { count: "exact", head: true })
      .eq("IsActive", true)
      .lte("Stock", threshold);

    if (error) return res.status(500).json({ message: error.message });

    return res.json({ count: count ?? 0, threshold });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

  export const listLowStock: RequestHandler = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold ?? 20);
    const limit = Number(req.query.limit ?? 100);
    const offset = Number(req.query.offset ?? 0);

    // 1️⃣ Get matching Product_Item rows (≤ threshold)
    const { data: items, error: iErr } = await supabase
      .from("Product_Item")
      .select("ProductItemID, ProductID, Stock, ExpiryDate, IsActive")
      .eq("IsActive", true)
      .lte("Stock", threshold);

    if (iErr) return res.status(500).json({ message: iErr.message });

    if (!items || items.length === 0) return res.json([]);

    // 2️⃣ Get Products related to these items
    const productIds = [...new Set(items.map((it) => it.ProductID))]; // unique IDs into array

    const { data: products, error: pErr } = await supabase
      .from("Product")
      .select("ProductID, Name, Category, Brand, SellingPrice, Image, IsActive")
      .eq("IsActive", true)
      .in("ProductID", productIds);

    if (pErr) return res.status(500).json({ message: pErr.message });

    const pMap = Object.fromEntries(products.map((p) => [p.ProductID, p]));

    // 3️⃣ Merge ProductItem + Product
    const rows = items.map((it, idx) => {
      const prod = pMap[it.ProductID];

      return {
        rowNo: offset + idx + 1,
        productItemId: it.ProductItemID,
        productId: it.ProductID,
        name: prod?.Name || "",
        category: prod?.Category || "",
        brand: prod?.Brand || "",
        price: Number(prod?.SellingPrice || 0),
        expiry: it.ExpiryDate,
        qty: Number(it.Stock || 0),
        image: prod?.Image || null,
      };
    });

    return res.json(rows.slice(offset, offset + limit));
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Internal Server Error" });
  }
};

  /**
   * Count expiring product items.
   * - warn: expiry within <= 6 months and > 3 months
   * - danger: expiry within <= 3 months
   * Only active Product_Item rows with a future ExpiryDate are considered.
   * Query params (optional): warn_months=6, danger_months=3
   */
  export const getExpiringCounts: RequestHandler = async (req, res) => {
    try {
      const WARN_M = Number(req.query.warn_months ?? 6);
      const DANGER_M = Number(req.query.danger_months ?? 3);
  
      const now = new Date();
      const warnUntil = new Date(now);
      warnUntil.setMonth(warnUntil.getMonth() + WARN_M);
  
      const dangerUntil = new Date(now);
      dangerUntil.setMonth(dangerUntil.getMonth() + DANGER_M);
  
      // Pull only items that could be expiring within WARN window
      const { data: items, error } = await supabase
        .from("Product_Item")
        .select("ProductItemID, ExpiryDate, IsActive")
        .eq("IsActive", true)
        .not("ExpiryDate", "is", null);
  
      if (error) return res.status(500).json({ message: error.message });
  
      let warn = 0;
      let danger = 0;
  
      for (const it of items ?? []) {
        const exp = new Date(it.ExpiryDate as any);
        if (isNaN(exp.getTime())) continue;
        if (exp <= now) continue; // already expired → not counted here
        if (exp <= warnUntil) {
          // within 6 months
          if (exp <= dangerUntil) danger++;
          else warn++;
        }
      }
  
      const total = warn + danger;
      return res.json({ total, warn, danger, warnMonths: WARN_M, dangerMonths: DANGER_M });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
    }
  };
  export const listExpiringBatches: RequestHandler = async (req, res) => {
    try {
      const months = Number(req.query.months ?? 6);   // warn threshold
      const danger = Number(req.query.danger ?? 3);   // danger threshold
      const limit = Number(req.query.limit ?? 100);   
      const offset = Number(req.query.offset ?? 0);    
  
      const now = new Date();
  
      const { data: items, error: iErr } = await supabase
        .from("Product_Item")
        .select("ProductItemID, ProductID, Stock, ExpiryDate, IsActive")
        .eq("IsActive", true)
        .not("ExpiryDate", "is", null);
  
      if (iErr) return res.status(500).json({ message: iErr.message });
  
      const { data: products, error: pErr } = await supabase
        .from("Product")
        .select("ProductID, Name, Category, Brand, IsActive")
        .eq("IsActive", true);
  
      if (pErr) return res.status(500).json({ message: pErr.message });
  
      const pMap = Object.fromEntries(
        (products ?? []).map(p => [p.ProductID, p])
      );
  
      const MS_PER_DAY = 1000 * 60 * 60 * 24; 
      const rows = (items ?? [])
        .map(it => {
          const prod = pMap[it.ProductID];
          if (!prod) return null;
  
          const exp = new Date(it.ExpiryDate as any);
          const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / MS_PER_DAY);
  
          const monthsLeft = daysLeft / 30;
          const level =
            monthsLeft <= danger ? "danger"
            : monthsLeft <= months ? "warn"
            : "ok";
  
          return {
            productItemId: it.ProductItemID,
            productId: it.ProductID,
            productName: prod.Name,
            category: prod.Category,
            brand: prod.Brand,
            expiryDate: exp.toISOString().slice(0, 10),
            daysLeft,
            qty: Number(it.Stock) || 0,
            expiryLevel: level, // "warn" or "danger" for your legend colors
          };
        })
        // Added: explicit type guard so TS knows nulls are removed
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .filter(r => r.expiryLevel !== "ok")
        .sort((a, b) => a.daysLeft - b.daysLeft);
  
      return res.json(rows.slice(offset, offset + limit));
    } catch (e: any) {
      return res.status(500).json({ message: e.message || "Internal Server Error" });
    }
  };
  
  /**
   * Count transactions. Optional window:
   *   ?from=YYYY-MM-DD&to=YYYY-MM-DD
   * If not provided, defaults to the current year (Jan 1 .. Dec 31).
   */
  export const getTransactionsCount: RequestHandler = async (req, res) => {
    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  
      const from = req.query.from ? new Date(String(req.query.from)) : yearStart;
      const to = req.query.to ? new Date(String(req.query.to)) : yearEnd;
  
      const { count, error } = await supabase
        .from("Transaction")
        .select("*", { count: "exact", head: true })
        .gte("OrderDateTime", from.toISOString())
        .lte("OrderDateTime", to.toISOString());
  
      if (error) return res.status(500).json({ message: error.message });
      return res.json({ count: count ?? 0, from: from.toISOString(), to: to.toISOString() });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
    }
  };
  
  /**
   * Total sales (sum of Transaction.Total) in a window.
   *   ?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Defaults to current year.
   */
  export const getTotalSales: RequestHandler = async (req, res) => {
    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  
      const from = req.query.from ? new Date(String(req.query.from)) : yearStart;
      const to = req.query.to ? new Date(String(req.query.to)) : yearEnd;
  
      const { data, error } = await supabase
        .from("Transaction")
        .select("Total, OrderDateTime")
        .gte("OrderDateTime", from.toISOString())
        .lte("OrderDateTime", to.toISOString());
  
      if (error) return res.status(500).json({ message: error.message });
  
      const totalSales = (data ?? []).reduce((sum, r: any) => sum + Number(r.Total || 0), 0);
      return res.json({
        totalSales,
        currency: "PHP", // adjust to your currency if needed
        from: from.toISOString(),
        to: to.toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
    }
  };


  export const getMonthlySales: RequestHandler = async (req, res) => {
    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  
      const from = req.query.from ? new Date(String(req.query.from)) : yearStart;
      const to   = req.query.to   ? new Date(String(req.query.to))   : yearEnd;
  
      // 1) Pull transactions (for money totals)
      const { data: txs, error: tErr } = await supabase
        .from("Transaction")
        .select("Total, OrderDateTime")
        .gte("OrderDateTime", from.toISOString())
        .lte("OrderDateTime", to.toISOString());
      if (tErr) return res.status(500).json({ message: tErr.message });
  
      // 2) Pull transaction items joined to their transaction date (for units sold)
      const { data: items, error: iErr } = await supabase
        .from("Transaction_Item")
        .select(`
          Quantity,
          Transaction:TransactionID ( OrderDateTime )
        `);
      if (iErr) return res.status(500).json({ message: iErr.message });
  
      // Only count items within the window
      const itemsInWindow = (items ?? []).filter(r => {
        const transaction = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
        const d = transaction?.OrderDateTime ? new Date(transaction.OrderDateTime) : null;
        return d && d >= from && d <= to;
      });
  
      // Aggregate
      const monthsOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const monthly: Record<string, { total: number; units: number }> = {};
      monthsOrder.forEach(m => (monthly[m] = { total: 0, units: 0 }));
  
      // totals by month
      for (const t of txs ?? []) {
        const d = new Date(t.OrderDateTime);
        const m = d.toLocaleString("en-US", { month: "short" }); // "Jan"
        if (monthly[m]) monthly[m].total += Number(t.Total || 0);
      }
  
      // units by month
      for (const it of itemsInWindow) {
        const transaction = Array.isArray(it.Transaction) ? it.Transaction[0] : it.Transaction;
        const d = new Date(transaction!.OrderDateTime as any);
        const m = d.toLocaleString("en-US", { month: "short" });
        if (monthly[m]) monthly[m].units += Number(it.Quantity || 0);
      }
  
      const data = monthsOrder.map(m => ({ month: m, total: monthly[m].total, units: monthly[m].units }));
      return res.json({ year: from.getFullYear(), data });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
    }
  };
  


export const getDailySales: RequestHandler = async (req, res) => {
  try {
    const daysLimit = Number(req.query.days ?? 60); // default 60 days
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - daysLimit);

    // 1️⃣ Get all transactions within the last N days
    const { data: txs, error } = await supabase
      .from("Transaction")
      .select("Total, OrderDateTime")
      .gte("OrderDateTime", from.toISOString())
      .lte("OrderDateTime", now.toISOString());

    if (error) return res.status(500).json({ message: error.message });

    // 2️⃣ Group totals by date
    const dayTotals: Record<string, { total: number; units: number }> = {};

    // Transactions (total)
    for (const t of txs ?? []) {
      const d = new Date(t.OrderDateTime);
      const dayKey = d.toISOString().slice(0, 10); // e.g., "2025-10-28"
      if (!dayTotals[dayKey]) dayTotals[dayKey] = { total: 0, units: 0 };
      dayTotals[dayKey].total += Number(t.Total || 0);
    }

    // Transaction items (units sold)
    const { data: items, error: iErr } = await supabase
      .from("Transaction_Item")
      .select(`
        Quantity,
        Transaction:TransactionID ( OrderDateTime )
      `);

    if (iErr) return res.status(500).json({ message: iErr.message });

    for (const it of items ?? []) {
      const transaction = Array.isArray(it.Transaction) ? it.Transaction[0] : it.Transaction;
      if (!transaction?.OrderDateTime) continue;
      const d = new Date(transaction.OrderDateTime);
      if (d < from || d > now) continue;

      const dayKey = d.toISOString().slice(0, 10);
      if (!dayTotals[dayKey]) dayTotals[dayKey] = { total: 0, units: 0 };
      dayTotals[dayKey].units += Number(it.Quantity || 0);
    }

    // 3️⃣ Convert to sorted array
    const data = Object.entries(dayTotals)
      .map(([day, { total, units }]) => ({ day, total, units }))
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

    return res.json({ from: from.toISOString(), to: now.toISOString(), data });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
  }
};

export const getWeeklySales: RequestHandler = async (req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    const from = req.query.from ? new Date(String(req.query.from)) : yearStart;
    const to = req.query.to ? new Date(String(req.query.to)) : yearEnd;

    const { data: txs, error: tErr } = await supabase
      .from("Transaction")
      .select("Total, OrderDateTime")
      .gte("OrderDateTime", from.toISOString())
      .lte("OrderDateTime", to.toISOString());
    if (tErr) return res.status(500).json({ message: tErr.message });

    const { data: items, error: iErr } = await supabase
      .from("Transaction_Item")
      .select(`Quantity, Transaction:TransactionID ( OrderDateTime )`);
    if (iErr) return res.status(500).json({ message: iErr.message });

    const itemsInWindow = (items ?? []).filter((r) => {
      const tx = Array.isArray(r.Transaction) ? r.Transaction[0] : r.Transaction;
      const d = tx?.OrderDateTime ? new Date(tx.OrderDateTime) : null;
      return d && d >= from && d <= to;
    });

    // Helper to get ISO week number
    const getWeek = (d: Date) => {
      const date = new Date(d.getTime());
      date.setHours(0, 0, 0, 0);
      // Thursday in current week decides the year.
      date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
      const week1 = new Date(date.getFullYear(), 0, 4);
      return (
        1 +
        Math.round(
          ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
        )
      );
    };

    const weekly: Record<string, { total: number; units: number }> = {};

    // Aggregate totals by week
    for (const t of txs ?? []) {
      const d = new Date(t.OrderDateTime);
      const key = `Week ${getWeek(d)}`;
      if (!weekly[key]) weekly[key] = { total: 0, units: 0 };
      weekly[key].total += Number(t.Total || 0);
    }

    // Aggregate units by week
    for (const it of itemsInWindow) {
      const tx = Array.isArray(it.Transaction) ? it.Transaction[0] : it.Transaction;
      const d = new Date(tx!.OrderDateTime);
      const key = `Week ${getWeek(d)}`;
      if (!weekly[key]) weekly[key] = { total: 0, units: 0 };
      weekly[key].units += Number(it.Quantity || 0);
    }

    const data = Object.keys(weekly).map((week) => ({
      week,
      total: weekly[week].total,
      units: weekly[week].units,
    }));

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
  }
};


export const getYearlySales: RequestHandler = async (req, res) => {
  try {
    const { data: txs, error: tErr } = await supabase
      .from("Transaction")
      .select("Total, OrderDateTime");
    if (tErr) return res.status(500).json({ message: tErr.message });

    const { data: items, error: iErr } = await supabase
      .from("Transaction_Item")
      .select(`Quantity, Transaction:TransactionID ( OrderDateTime )`);
    if (iErr) return res.status(500).json({ message: iErr.message });

    const yearly: Record<string, { total: number; units: number }> = {};

    for (const t of txs ?? []) {
      const y = new Date(t.OrderDateTime).getFullYear();
      if (!yearly[y]) yearly[y] = { total: 0, units: 0 };
      yearly[y].total += Number(t.Total || 0);
    }

    for (const it of items ?? []) {
      const tx = Array.isArray(it.Transaction) ? it.Transaction[0] : it.Transaction;
      const y = new Date(tx!.OrderDateTime).getFullYear();
      if (!yearly[y]) yearly[y] = { total: 0, units: 0 };
      yearly[y].units += Number(it.Quantity || 0);
    }

    const data = Object.keys(yearly)
      .sort()
      .map((y) => ({
        year: Number(y),
        total: yearly[y].total,
        units: yearly[y].units,
      }));

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
  }
};
