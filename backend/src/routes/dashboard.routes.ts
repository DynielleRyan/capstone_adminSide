import { getExpiringCounts, getLowStockCount, getMonthlySales, getTotalSales, getTransactionsCount, listExpiringBatches, listLowStock } from "../controllers/dashboard.controllers";
import { Router } from "express";
import { authenticate, adminOrPharmacist } from "../middleware/auth";

const router = Router();

// All dashboard routes require authentication
// Admin and Pharmacist can view dashboard data
router.get("/lowstock", authenticate, adminOrPharmacist, getLowStockCount);
router.get("/lowstock_list", authenticate, adminOrPharmacist, listLowStock);
router.get("/expire", authenticate, adminOrPharmacist, getExpiringCounts);
router.get("/expire_list", authenticate, adminOrPharmacist, listExpiringBatches);
router.get("/transac_total", authenticate, adminOrPharmacist, getTransactionsCount);
router.get("/sales", authenticate, adminOrPharmacist, getTotalSales);
router.get("/sales_month", authenticate, adminOrPharmacist, getMonthlySales);

export default router;