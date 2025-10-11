// backend/src/routes/report.routes.ts
import { getMonthlyTransactionTotals, getYearlyTransactionTotals } from "../controllers/report.controllers";
import { Router } from "express";


const router = Router();
router.get("/transactions/monthly", getMonthlyTransactionTotals);
router.get("/transactions/yearly", getYearlyTransactionTotals);

export default router;
