import { Router } from 'express';
import {
  createUser,
  createAdminUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile,
  getUserWithPharmacist
} from '../controllers/userControllers';
import { authenticate, adminOnly, adminOrPharmacist } from '../middleware/auth';

const router = Router();

// User CRUD routes - All protected

// Create a new admin user (Admin only)
router.post('/admin', authenticate, adminOnly, createAdminUser);
// Create a new admin user (Public - No authentication required)
// router.post('/admin', createAdminUser);

// Create a new user (Admin only)
router.post('/', authenticate, adminOnly, createUser);

// Get all users with pagination and filtering (Admin and Pharmacist)
router.get('/', authenticate, adminOrPharmacist, getUsers);

// Get user by ID (Admin and Pharmacist)
router.get('/:id', authenticate, adminOrPharmacist, getUserById);

// Update user (Admin only)
router.put('/:id', authenticate, adminOnly, updateUser);

// Delete user (Admin only)
router.delete('/:id', authenticate, adminOnly, deleteUser);

// Update user profile (Admin and Pharmacist can update their own profile)
router.put('/:id/profile', authenticate, adminOrPharmacist, updateProfile);

// Get user with pharmacist information (Admin and Pharmacist)
router.get('/:id/pharmacist', authenticate, adminOrPharmacist, getUserWithPharmacist);

export default router;
