import { Router } from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier
} from '../controllers/supplierControllers';
import { authenticate, adminOrPharmacist } from '../middleware/auth';

const router = Router();

// Supplier CRUD routes - All protected, Admin and Pharmacist only

// Create a new supplier
router.post('/', authenticate, adminOrPharmacist, createSupplier);

// Get all suppliers with pagination and filtering
router.get('/', authenticate, adminOrPharmacist, getSuppliers);

// Get supplier by ID
router.get('/:id', authenticate, adminOrPharmacist, getSupplierById);

// Update supplier
router.put('/:id', authenticate, adminOrPharmacist, updateSupplier);

// Delete supplier
router.delete('/:id', authenticate, adminOrPharmacist, deleteSupplier);

export default router;
