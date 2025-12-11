import { RequestHandler } from "express";
import { supabase } from "../config/database";
import { sendSMS } from "../services/sms";
import { smsSentToday, logSmsSend } from "../services/smsLog";

// ======================================================
//  Manual Trigger (Postman) — HAS req + res
// ======================================================
export const sendInventorySMSAlert: RequestHandler = async (req, res) => {
  try {
    // Force resend for testing
    // Example: /api/notifications/sms-alert?force=1
    const force = req.query.force === "1";

    const result = await sendInventorySMSAlertCron(force);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// ======================================================
// Cron Version — NO req/res
// Cron does not support req.query
// ======================================================
export async function sendInventorySMSAlertCron(force = false) {
  const ADMIN_PHONE = process.env.ADMIN_PHONE;

  if (!ADMIN_PHONE)
    return { smsSent: false, message: "ADMIN_PHONE missing" };

  // Check if already sent today (skip unless forced)
  const alreadySent = await smsSentToday();
  if (alreadySent && !force) {
    console.log(" SMS skipped — already sent today");
    return { smsSent: false, reason: "already_sent_today" };
  }

  // COUNT LOW STOCK PRODUCTS (matching reorder report logic)
  // Count products where TOTAL stock (sum of all batches) <= threshold
  const threshold = 20;
  
  // Get all active product items
  const { data: allItems, error: itemErr } = await supabase
    .from("Product_Item")
    .select("ProductID, Stock, IsActive")
    .eq("IsActive", true);
  
  if (itemErr) throw itemErr;

  // Calculate total stock per product
  const totalStock: Record<string, number> = {};
  for (const it of allItems ?? []) {
    const pid = it.ProductID;
    const stock = Number(it.Stock) || 0;
    if (!(pid in totalStock)) {
      totalStock[pid] = stock;
    } else {
      totalStock[pid] += stock;
    }
  }

  // Get product IDs where total stock <= threshold
  const lowStockProductIds = Object.keys(totalStock).filter(
    pid => (totalStock[pid] || 0) <= threshold
  );

  // Only count products that are active
  let low = 0;
  if (lowStockProductIds.length > 0) {
    const { data: activeProducts, error: prodErr } = await supabase
      .from("Product")
      .select("ProductID")
      .eq("IsActive", true)
      .in("ProductID", lowStockProductIds);
    
    if (prodErr) throw prodErr;
    low = activeProducts?.length || 0;
  }

  // COUNT EXPIRING (matching dashboard logic)
  // Count items expiring within 6 months, excluding already expired items
  const now = new Date();
  const warnUntil = new Date(now);
  warnUntil.setMonth(warnUntil.getMonth() + 6);

  const { data: expiringItems, error: expErr } = await supabase
    .from("Product_Item")
    .select("ProductItemID, ExpiryDate, IsActive")
    .eq("IsActive", true)
    .not("ExpiryDate", "is", null);
  if (expErr) throw expErr;

  // Filter items: must be future date and within 6 months
  // This matches getExpiringCounts logic exactly
  let expiring = 0;
  for (const it of expiringItems ?? []) {
    const exp = new Date(it.ExpiryDate as any);
    if (isNaN(exp.getTime())) continue; // Skip invalid dates
    if (exp <= now) continue; // Skip already expired items
    if (exp <= warnUntil) {
      expiring++; // Count items expiring within 6 months
    }
  }

  // If nothing critical, skip SMS
  if (!force && low === 0 && expiring === 0) {
    console.log("No critical alerts — SMS not sent");
    return { smsSent: false, reason: "no_critical_items" };
  }

  // SMS MESSAGE (Professional format, optimized for Twilio)
  // Target: < 160 chars for single SMS segment (GSM-7 encoding)
  // Avoids special characters to prevent UCS-2 encoding (70 char limit)
  // Format date/time in Philippine timezone (Asia/Manila, UTC+8)
  
  // Convert to Philippine timezone explicitly
  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  
  const dateStr = phTime.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    timeZone: "Asia/Manila"
  });
  const timeStr = phTime.toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila"
  });

  // Professional, concise format
  // Example output: ~85-95 characters (well under 160 limit)
  const text = 
    `JAMBOS PHARMACY ALERT\n` +
    `Low Stock: ${low} products\n` +
    `Expiring: ${expiring} items\n` +
    `${dateStr}`;
  
  // Character count validation (should be ~85-95 chars)
  // Twilio limits: 160 chars (GSM-7) or 70 chars (UCS-2)
  // This format uses only standard ASCII, stays in GSM-7 encoding
  if (text.length > 160) {
    console.warn(`SMS message length (${text.length}) exceeds recommended limit`);
  }

  // SEND SMS
  const sms = await sendSMS(ADMIN_PHONE, text);

  // Log only if successful 
  if (sms) await logSmsSend();

  return { smsSent: !!sms, low, expiring, sms };
}
