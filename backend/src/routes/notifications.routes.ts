import { Router } from "express";
import {
 listNotifications, markRead, scanNow
} from "../controllers/notification.controllers";

const router = Router();

router.get("/", listNotifications);
router.patch("/read", markRead);
router.post("/scan", scanNow);


export default router;
