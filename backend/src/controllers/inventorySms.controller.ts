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

  // COUNT LOW STOCK
  const { count: low, error: lowErr } = await supabase
    .from("Product_Item")
    .select("*", { count: "exact", head: true })
    .eq("IsActive", true)
    .lte("Stock", 20);
  if (lowErr) throw lowErr;

  // COUNT EXPIRING
  const now = new Date();
  const warnUntil = new Date();
  warnUntil.setMonth(warnUntil.getMonth() + 6);

  const { data: items, error: expErr } = await supabase
    .from("Product_Item")
    .select("ExpiryDate, IsActive")
    .eq("IsActive", true)
    .not("ExpiryDate", "is", null);
  if (expErr) throw expErr;

  const expiring =
    items?.filter((it) => {
      const expDate = new Date(it.ExpiryDate);
      return expDate > now && expDate <= warnUntil;
    }).length ?? 0;

  // If nothing critical, skip SMS
  if (!force && low === 0 && expiring === 0) {
    console.log("No critical alerts — SMS not sent");
    return { smsSent: false, reason: "no_critical_items" };
  }

  // SMS MESSAGE
  const text =
    `Jambo's Pharmacy Alert\n` +
    `Low Stock: ${low}\n` +
    `Expiring Soon: ${expiring}\n` +
    `Date: ${new Date().toLocaleString("en-PH")}`;

  // SEND SMS
  const sms = await sendSMS(ADMIN_PHONE, text);

  // Log only if successful 
  if (sms) await logSmsSend();

  return { smsSent: !!sms, low, expiring, sms };
}
