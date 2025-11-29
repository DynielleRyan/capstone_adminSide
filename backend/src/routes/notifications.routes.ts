import { Router } from "express";
import {
 listNotifications, markRead, scanNow
} from "../controllers/notification.controllers";
import { sendInventorySMSAlert } from "../controllers/inventorySms.controller";

const router = Router();

router.get("/", listNotifications);
router.patch("/read", markRead);
router.post("/scan", scanNow);

// Tester Inventory SMS Alert (equal the "force" to true)
router.post("/sms-alert", sendInventorySMSAlert);

//twilio test route
// router.post("/test-sms", async (req, res) => {
//   const phone = process.env.ADMIN_PHONE!;
//   const { sendSMS } = await import("../services/sms");

//   const result = await sendSMS(phone, "Hello from Twilio!");

//   res.json(result);
// });

export default router;
