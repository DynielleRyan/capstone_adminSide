import { getDailySales, getExpiringCounts, getLowStockCount, getMonthlySales, getTotalSales, getTransactionsCount, getWeeklySales, getYearlySales, listExpiringBatches, listLowStock } from "../controllers/dashboard.controllers";
import { Router } from "express";

const router = Router();

router.get("/lowstock", getLowStockCount);
router.get("/lowstock_list", listLowStock);
router.get("/expire",getExpiringCounts);
router.get("/expire_list", listExpiringBatches)
router.get("/transac_total",getTransactionsCount);
router.get("/sales", getTotalSales);
router.get("/sales_month", getMonthlySales);
router.get("/sales_day", getDailySales);
router.get("/sales_week", getWeeklySales);
router.get("/sales_year", getYearlySales);


export default router;