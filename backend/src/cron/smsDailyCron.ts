import cron from "node-cron";
import { sendInventorySMSAlertCron } from "../controllers/inventorySms.controller";

export function startDailySmsCron() {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running Daily SMS Alert (9 AM)");
    await sendInventorySMSAlertCron();
  });

  console.log(" Daily SMS Cron Initialized (Runs at 9:00 AM)");
}
