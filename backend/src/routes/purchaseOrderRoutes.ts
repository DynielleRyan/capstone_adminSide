import express from 'express';  
import * as purchaseOrderController from '../controllers/purchaseOrderController';
import { authenticate, adminOrPharmacist } from '../middleware/auth';

const router = express.Router();

// All purchase order routes require authentication
// Admin and Pharmacist can manage purchase orders
router.get("/products", authenticate, adminOrPharmacist, purchaseOrderController.getProducts);
router.get("/", authenticate, adminOrPharmacist, purchaseOrderController.getPurchaseOrders);
router.get("/:id", authenticate, adminOrPharmacist, purchaseOrderController.getPurchaseOrderByID);
router.post("/", authenticate, adminOrPharmacist, purchaseOrderController.createPurchaseOrder);
router.put("/:id", authenticate, adminOrPharmacist, purchaseOrderController.updatePurchaseOrder);

export default router;