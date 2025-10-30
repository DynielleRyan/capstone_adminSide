import { Router } from 'express';
import {
  signIn,
  signOut,
  getCurrentUser,
  resendVerificationEmail
} from '../controllers/userControllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// Authentication routes

// Sign in - Public
router.post('/signin', signIn);

// Sign out - Public (can be called even if token expired)
router.post('/signout', signOut);

// Get current user - Protected
router.get('/me', authenticate, getCurrentUser);

// Resend verification email - Public
router.post('/resend-verification', resendVerificationEmail);

export default router;
