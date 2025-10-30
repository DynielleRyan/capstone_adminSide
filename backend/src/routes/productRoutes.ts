// Inventory routes
import express from 'express';

import {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductSourceList,
    uploadImage,
} from '../controllers/productControllers';
import { authenticate, adminOrPharmacist } from '../middleware/auth';

const router = express.Router();

// All product routes require authentication
// Admin and Pharmacist can view and manage products
router.get('/', authenticate, adminOrPharmacist, getAllProducts);
router.get('/source-list', authenticate, adminOrPharmacist, getProductSourceList);
router.get('/:id', authenticate, adminOrPharmacist, getProductById);
router.post('/', authenticate, adminOrPharmacist, createProduct);
router.post('/upload-image', authenticate, adminOrPharmacist, uploadImage);
router.put('/:id', authenticate, adminOrPharmacist, updateProduct);
router.delete('/:id', authenticate, adminOrPharmacist, deleteProduct);

export default router; 