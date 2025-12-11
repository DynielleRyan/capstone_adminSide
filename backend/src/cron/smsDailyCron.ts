import cron from "node-cron";
import axios from "axios";
import { sendInventorySMSAlertCron } from "../controllers/inventorySms.controller";

// Keep-alive function to prevent Railway service from sleeping
function startKeepAlive() {
  const keepAliveUrl = process.env.KEEP_ALIVE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
    : null);

  if (!keepAliveUrl) {
    console.log("⚠️  Keep-alive disabled (no KEEP_ALIVE_URL or RAILWAY_PUBLIC_DOMAIN set)");
    return;
  }

  // Ping health endpoint every 5 minutes to prevent sleep
  cron.schedule("*/5 * * * *", async () => {
    try {
      const response = await axios.get(keepAliveUrl, {
        headers: { 'User-Agent': 'Railway-KeepAlive' },
        timeout: 10000 // 10 second timeout
      });
      if (response.status === 200) {
        console.log("✅ Keep-alive ping successful");
      }
    } catch (error: any) {
      console.error("❌ Keep-alive ping failed:", error.message || error);
    }
  }, {
    timezone: "Asia/Manila"
  });

  console.log("🔄 Keep-alive initialized (pings every 5 minutes)");
}

export function startDailySmsCron() {
  // Start keep-alive to prevent service sleep
  startKeepAlive();

  // Schedule daily SMS at 9 AM PHT
  cron.schedule("0 9 * * *", async () => {
    console.log("Running Daily SMS Alert (9 AM PHT)");
    await sendInventorySMSAlertCron();
  }, {
    timezone: "Asia/Manila"
  });

  console.log("📱 Daily SMS Cron Initialized (Runs at 9:00 AM PHT)");
}
