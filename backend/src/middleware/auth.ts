import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        userId: number;
      };
    }
  }
}

/**
 * Authentication middleware - Verifies JWT token from Supabase
 * Adds user information to req.user if valid
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get user from database using AuthUserID
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('AuthUserID', authUser.id)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        message: 'User not found in database'
      });
      return;
    }

    // Attach user info to request object
    req.user = {
      id: authUser.id,
      email: user.Email,
      role: user.Roles,
      userId: user.UserID
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Authorization middleware factory - Checks if user has required role(s)
 * @param roles - Array of allowed roles or single role string
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + roles.join(' or ')
      });
      return;
    }

    next();
  };
};

/**
 * Admin only middleware - Shorthand for authorize('Admin')
 */
export const adminOnly = authorize('Admin');

/**
 * Admin or Pharmacist middleware - Common combination
 */
export const adminOrPharmacist = authorize('Admin', 'Pharmacist');

/**
 * Any authenticated user middleware - All roles allowed
 */
export const anyAuthenticated = authorize('Admin', 'Pharmacist', 'Clerk');

