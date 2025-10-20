import express from 'express';  
import * as transactionController from '../controllers/transactionController';

const router = express.Router();

router.get("/", transactionController.getTransactions);
router.get("/:id", transactionController.getTransactionAndItemsByID);

export default router;