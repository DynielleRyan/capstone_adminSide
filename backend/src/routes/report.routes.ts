// backend/src/routes/report.routes.ts
import { getMonthlyTransactionTotals, getReorderLevelFromItems, getTopItems, getYearlyTransactionTotals } from "../controllers/report.controllers";
import { Router } from "express";


const router = Router();
router.get("/transac_monthly", getMonthlyTransactionTotals);
router.get("/transac_yearly", getYearlyTransactionTotals);
router.get("/top_items", getTopItems);
router.get("/reorder", getReorderLevelFromItems);

export default router;
