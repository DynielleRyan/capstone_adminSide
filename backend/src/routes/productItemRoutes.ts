import { Router } from 'express';
import {
  getAllProductItems,
  getProductItemById,
  getProductItemsByProductId,
  createProductItem,
  updateProductItem,
  deleteProductItem,
  getLowStockItems,
  getExpiringItems
} from '../controllers/productItemControllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all product items with filtering and pagination
router.get('/', getAllProductItems);

// Get low stock items
router.get('/low-stock', getLowStockItems);

// Get expiring items
router.get('/expiring', getExpiringItems);

// Get product items by product ID
router.get('/product/:productId', getProductItemsByProductId);

// Get single product item by ID
router.get('/:id', getProductItemById);

// Create new product item
router.post('/', createProductItem);

// Update product item
router.put('/:id', updateProductItem);

// Delete product item (soft delete)
router.delete('/:id', deleteProductItem);

export default router;

