import { Router } from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier
} from '../controllers/supplierControllers';

const router = Router();

// Supplier CRUD routes

// Create a new supplier
router.post('/', createSupplier);

// Get all suppliers with pagination and filtering
router.get('/', getSuppliers);

// Get supplier by ID
router.get('/:id', getSupplierById);

// Update supplier
router.put('/:id', updateSupplier);

// Delete supplier
router.delete('/:id', deleteSupplier);

export default router;
