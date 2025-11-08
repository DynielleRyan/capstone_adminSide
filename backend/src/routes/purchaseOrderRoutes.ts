import express from 'express';  
import * as purchaseOrderController from '../controllers/purchaseOrderController';
import { authenticate, adminOnly } from '../middleware/auth';

const router = express.Router();

// All purchase order routes require authentication
// Admin and Pharmacist can manage purchase orders
router.get("/products", authenticate, adminOnly, purchaseOrderController.getProducts);
router.get("/", authenticate, adminOnly, purchaseOrderController.getPurchaseOrders);
router.get("/:id", authenticate, adminOnly, purchaseOrderController.getPurchaseOrderByID);
router.post("/", authenticate, adminOnly, purchaseOrderController.createPurchaseOrder);
router.put("/:id", authenticate, adminOnly, purchaseOrderController.updatePurchaseOrder);

export default router;