import { RequestHandler } from "express";
import { supabase } from "../config/database";

/**
 * Count products whose TOTAL stock (sum of Product_Item.Stock across active rows)
 * is <= threshold (default 20).
 */
export const getLowStockCount: RequestHandler = async (req, res) => {
    try {
      const threshold = Number(req.query.threshold ?? 20);
  
      // Build totals from Product_Item (active)
      const { data: items, error: iErr } = await supabase
        .from("Product_Item")
        .select("ProductID, Stock, IsActive")
        .eq("IsActive", true);
      if (iErr) return res.status(500).json({ message: iErr.message });
  
      const totals: Record<string, number> = {};
      for (const r of items ?? []) {
        const pid = r.ProductID as string;
        totals[pid] = (totals[pid] ?? 0) + (Number(r.Stock) || 0);
      }
  
      // Count over active products (default 0 if no batches)
      const { data: products, error: pErr } = await supabase
        .from("Product")
        .select("ProductID, IsActive")
        .eq("IsActive", true);
      if (pErr) return res.status(500).json({ message: pErr.message });
  
      let count = 0;
      for (const p of products ?? []) {
        const qty = totals[p.ProductID] ?? 0;
        if (qty <= threshold) count++;
      }
      return res.json({ count, threshold });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Internal Server Error" });
    }
  };
  export const listLowStock: RequestHandler = async (req, res) => {
    try {
      const threshold = Number(req.query.threshold ?? 20);
      const limit = Number(req.query.limit ?? 100);
      const offset = Number(req.query.offset ?? 0);
  
      // 1) Grab all active products with basic info
      const { data: products, error: pErr } = await supabase
        .from("Product")
        .select("ProductID, Name, Category, Brand, Image, SellingPrice, IsActive")
        .eq("IsActive", true);
      if (pErr) return res.status(500).json({ message: pErr.message });
  
      // 2) Grab all active product-item rows (stock + expiry)
      const { data: items, error: iErr } = await supabase
        .from("Product_Item")
        .select("ProductID, Stock, ExpiryDate, IsActive")
        .eq("IsActive", true);
      if (iErr) return res.status(500).json({ message: iErr.message });
  
      // 3) Aggregate totals and earliest expiry per product
      const totals: Record<string, number> = {};
      const earliestExpiry: Record<string, string | null> = {};
  
      for (const r of items ?? []) {
        const pid = r.ProductID as string;
        const qty = Number(r.Stock) || 0;
        totals[pid] = (totals[pid] ?? 0) + qty;
  
        const expStr = r.ExpiryDate as unknown as string | null;
        if (expStr) {
          const prev = earliestExpiry[pid];
          earliestExpiry[pid] =
            !prev || new Date(expStr) < new Date(prev) ? expStr : prev;
        } else if (!(pid in earliestExpiry)) {
          earliestExpiry[pid] = null;
        }
      }
  
      // 4) Build rows, filter by threshold, sort by qty asc
      const rows = (products ?? [])
        .map((p) => {
          const pid = p.ProductID as string;
          const qty = totals[pid] ?? 0;
          return {
            productId: pid,
            name: p.Name as string,
            category: (p.Category as string) || "",
            brand: (p.Brand as string) || "",
            price: Number(p.SellingPrice) || 0,
            expiry: earliestExpiry[pid] ?? null, // earliest expiry across batches
            qty,                                  // total qty across batches
            image: (p.Image as string) || null,   // optional for thumbnail
          };
        })
        .filter((r) => r.qty <= threshold)
        .sort((a, b) => a.qty - b.qty);
  
      // 5) Page and add 1-based "rowNo" for the leftmost ID column
      const page = rows.slice(offset, offset + limit).map((r, idx) => ({
        rowNo: offset + idx + 1,
        ...r,
      }));
  
      return res.json(page);
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Internal Server Error" });
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
  
