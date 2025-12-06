import { Router } from 'express';
import {
  signIn,
  signOut,
  getCurrentUser,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  refreshToken
} from '../controllers/userControllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// Authentication routes

// Sign in - Public
router.post('/signin', signIn);

// Sign out - Public (can be called even if token expired)
router.post('/signout', signOut);

// Refresh token - Public
router.post('/refresh', refreshToken);

// Get current user - Protected
router.get('/me', authenticate, getCurrentUser);

// Resend verification email - Public
router.post('/resend-verification', resendVerificationEmail);

// Request password reset - Public
router.post('/forgot-password', requestPasswordReset);

// Reset password - Requires valid reset token
router.post('/reset-password', resetPassword);

export default router;
