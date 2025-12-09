// backend/src/routes/report.routes.ts
import { getDailyTransactionTotals, getMonthlyTransactionTotals, getReorderLevelFromItems, getTopItems, getWeeklyTransactionTotals, getYearlyTransactionTotals } from "../controllers/report.controllers";
import { Router } from "express";
import { authenticate, adminOrPharmacist } from "../middleware/auth";

const router = Router();

// All report routes require authentication
// Admin and Pharmacist can view reports
router.get("/transac_daily", authenticate, adminOrPharmacist, getDailyTransactionTotals);
router.get("/transac_weekly", authenticate, adminOrPharmacist, getWeeklyTransactionTotals);
router.get("/transac_monthly", authenticate, adminOrPharmacist, getMonthlyTransactionTotals);
router.get("/transac_yearly", authenticate, adminOrPharmacist, getYearlyTransactionTotals);
router.get("/top_items", authenticate, adminOrPharmacist, getTopItems);
router.get("/reorder", authenticate, adminOrPharmacist, getReorderLevelFromItems);

export default router;
