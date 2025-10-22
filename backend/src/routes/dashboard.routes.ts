import { getExpiringCounts, getLowStockCount, getMonthlySales, getTotalSales, getTransactionsCount, listExpiringBatches, listLowStock } from "../controllers/dashboard.controllers";
import { Router } from "express";

const router = Router();

router.get("/lowstock", getLowStockCount);
router.get("/lowstock_list", listLowStock);
router.get("/expire",getExpiringCounts);
router.get("/expire_list", listExpiringBatches)
router.get("/transac_total",getTransactionsCount);
router.get("/sales", getTotalSales);
router.get("/sales_month", getMonthlySales);

export default router;