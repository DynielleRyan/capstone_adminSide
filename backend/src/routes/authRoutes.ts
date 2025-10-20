import { Router } from 'express';
import {
  signIn,
  signOut,
  getCurrentUser,
  resendVerificationEmail
} from '../controllers/userControllers';

const router = Router();

// Authentication routes

// Sign in
router.post('/signin', signIn);

// Sign out
router.post('/signout', signOut);

// Get current user
router.get('/me', getCurrentUser);

// Resend verification email
router.post('/resend-verification', resendVerificationEmail);

export default router;

