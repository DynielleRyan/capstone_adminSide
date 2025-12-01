import express from 'express';  
import * as productListController from '../controllers/productListController';
import { authenticate, adminOrPharmacist } from "../middleware/auth";


const router = express.Router();

router.get("/",  authenticate, adminOrPharmacist, productListController.getProductList);
router.get("/:id",  authenticate, adminOrPharmacist, productListController.getProductItemByID);
router.patch("/:id",  authenticate, adminOrPharmacist, productListController.deleteProductItemByID);


export default router;