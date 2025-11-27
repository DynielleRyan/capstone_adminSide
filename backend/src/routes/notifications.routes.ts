import { Router } from "express";
import {
 listNotifications, markRead, scanNow
} from "../controllers/notification.controllers";
import { sendInventorySMSAlert } from "../controllers/inventorySms.controller";

const router = Router();

router.get("/", listNotifications);
router.patch("/read", markRead);
router.post("/scan", scanNow);
router.post("/sms-alert", sendInventorySMSAlert);

export default router;
