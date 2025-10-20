import express from 'express';  
import * as purchaseOrderController from '../controllers/purchaseOrderController';

const router = express.Router();

router.get("/products", purchaseOrderController.getProducts);
router.get("/", purchaseOrderController.getPurchaseOrders);
router.get("/:id", purchaseOrderController.getPurchaseOrderByID);
router.post("/", purchaseOrderController.createPurchaseOrder);
router.put("/:id", purchaseOrderController.updatePurchaseOrder);

export default router;