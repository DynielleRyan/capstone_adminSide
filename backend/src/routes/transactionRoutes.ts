import express from 'express';  
import * as transactionController from '../controllers/transactionController';
import { authenticate, adminOnly } from '../middleware/auth';

const router = express.Router();

// All transaction routes require authentication
// Admin and Pharmacist can view transactions
router.get("/quantities",authenticate, adminOnly, transactionController.getTransactionQtyMap);
router.get("/", authenticate, adminOnly, transactionController.getTransactions);
router.get("/:id", authenticate, adminOnly, transactionController.getTransactionAndItemsByID);

export default router;