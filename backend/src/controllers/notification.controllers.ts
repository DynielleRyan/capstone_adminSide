import { RequestHandler } from "express";
import { supabase, supabaseAdmin } from "../config/database";

// 🔧 You can tweak these thresholds
const LOW_STOCK_LIMIT = 20;
const EXPIRY_DAYS = 60;

/**
 * Fetch all unread notifications.
 */
export const listNotifications: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("Notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const unread = data?.filter((n) => !n.is_read).length ?? 0;
    return res.json({ items: data ?? [], unread });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Mark selected notifications as read.
 */
export const markRead: RequestHandler = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "No IDs provided" });

    const { error } = await supabaseAdmin
      .from("Notifications")
      .update({ is_read: true })
      .in("id", ids);

    if (error) throw error;
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Scan for low stock and expiring products → create notifications.
 */
export const scanNow: RequestHandler = async (req, res) => {
  try {
    const threshold = Number(req.body?.lowStockThreshold ?? 20);
    const warnMonths = Number(req.body?.warnMonths ?? 6);

    const today = new Date();
    const yyyyMmDd = today.toISOString().slice(0, 10);

    // 1) Pull active item rows once
    const { data: items, error: itemErr } = await supabase
      .from("Product_Item")
      .select("ProductItemID, ProductID, Stock, ExpiryDate, IsActive")
      .eq("IsActive", true);

    if (itemErr) return res.status(500).json({ message: itemErr.message });

    const now = new Date();
    const warnUntil = new Date(now);
    warnUntil.setMonth(warnUntil.getMonth() + warnMonths);

    // 2) Split into low-stock & expiring
    const lowStock = (items ?? []).filter(i => (Number(i.Stock) || 0) <= threshold);

    const expiring = (items ?? []).filter(i => {
      const exp = i.ExpiryDate ? new Date(i.ExpiryDate as any) : null;
      return !!exp && exp > now && exp <= warnUntil;
    });

    // 3) Build a ProductID -> Name map so messages show names
    const productIds = Array.from(
      new Set([...(lowStock.map(i => i.ProductID)), ...(expiring.map(i => i.ProductID))])
    );

    let nameById = new Map<string, string>();
    if (productIds.length) {
      const { data: prodRows, error: prodErr } = await supabase
        .from("Product")
        .select("ProductID, Name")
        .in("ProductID", productIds);

      if (prodErr) return res.status(500).json({ message: prodErr.message });
      nameById = new Map((prodRows ?? []).map(p => [p.ProductID as string, p.Name as string]));
    }

    // 4) Pull existing notifications for today to avoid duplicates
    const { data: existing, error: existErr } = await supabase
      .from("Notifications")
      .select("type, product_item_id, created_date")
      .eq("created_date", yyyyMmDd);

    if (existErr) return res.status(500).json({ message: existErr.message });

    const existingSet = new Set(
      (existing ?? []).map(row => `${row.type}|${row.product_item_id}|${yyyyMmDd}`)
    );

    // 5) Build new rows
    const newRows: any[] = [];

    for (const item of lowStock) {
      const key = `LOW_STOCK|${item.ProductItemID}|${yyyyMmDd}`;
      if (existingSet.has(key)) continue;

      const name = nameById.get(item.ProductID) ?? "Unknown Product";
      newRows.push({
        type: "LOW_STOCK",
        product_id: item.ProductID,
        product_item_id: item.ProductItemID,
        title: "Low Stock Alert",
        message: `${name} has low stock (${Number(item.Stock) || 0}).`,
        severity: "warning",
        is_read: false,
        sent_sms: false,
        created_at: new Date().toISOString(),
        created_date: yyyyMmDd,
        meta: {},
      });
    }

    for (const item of expiring) {
      const key = `EXPIRING|${item.ProductItemID}|${yyyyMmDd}`;
      if (existingSet.has(key)) continue;

      const name = nameById.get(item.ProductID) ?? "Unknown Product";
      newRows.push({
        type: "EXPIRING",
        product_id: item.ProductID,
        product_item_id: item.ProductItemID,
        title: "Expiring Soon",
        message: `${name} expires on ${(item.ExpiryDate as any)?.toString().slice(0, 10)}.`,
        severity: "danger",
        is_read: false,
        sent_sms: false,
        created_at: new Date().toISOString(),
        created_date: yyyyMmDd,
        meta: {},
      });
    }

    if (!newRows.length) {
      return res.status(200).json({ inserted: 0, message: "No new notifications." });
    }

    // 6) Insert using service role
    const { error: insErr } = await supabaseAdmin
      .from("Notifications")
      .insert(newRows);

    if (insErr) return res.status(500).json({ message: insErr.message });

    return res.status(201).json({ inserted: newRows.length });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message ?? "Internal Server Error" });
  }
};
