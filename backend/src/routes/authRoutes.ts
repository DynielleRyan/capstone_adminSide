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
import {
  checkDeviceVerification,
  sendOTP,
  verifyOTP
} from '../controllers/otpControllers';
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

// OTP / Device verification routes
// Check if device verification is required - Protected
router.post('/check-device', authenticate, checkDeviceVerification);

// Send OTP to user's email - Protected
router.post('/send-otp', authenticate, sendOTP);

// Verify OTP and trust device - Protected
router.post('/verify-otp', authenticate, verifyOTP);

export default router;
