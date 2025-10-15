import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile,
  getUserWithPharmacist
} from '../controllers/userControllers';

const router = Router();

// User CRUD routes

// Create a new user
router.post('/', createUser);

// Get all users with pagination and filtering
router.get('/', getUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user
router.put('/:id', updateUser);

// Delete user (soft delete)
router.delete('/:id', deleteUser);

// Update user profile (excluding sensitive fields)
router.put('/:id/profile', updateProfile);

// Get user with pharmacist information
router.get('/:id/pharmacist', getUserWithPharmacist);

export default router;
