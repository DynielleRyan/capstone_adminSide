import express from 'express';  
import * as transactionController from '../controllers/transactionController';
import { authenticate, adminOrPharmacist } from '../middleware/auth';

const router = express.Router();
// All transaction routes require authentication
// Admin and Pharmacist can view transactions

router.get("/quantities",authenticate, adminOrPharmacist, transactionController.getTransactionQtyMap);
router.get("/", authenticate, adminOrPharmacist, transactionController.getTransactions);
router.get("/:id", authenticate, adminOrPharmacist, transactionController.getTransactionAndItemsByID);


export default router;