import express from 'express';  
import * as productListController from '../controllers/productListController';
import { authenticate, adminOrPharmacist } from "../middleware/auth";


const router = express.Router();

router.get("/",  authenticate, adminOrPharmacist, productListController.getProductItems);
router.get("/:id",  authenticate, adminOrPharmacist, productListController.getProductItemByID);

export default router;