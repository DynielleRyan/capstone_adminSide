import { authService } from '../services/authService'

/**
 * Permission utility functions for role-based access control
 */

export type UserRole = 'Admin' | 'Pharmacist' | 'Clerk'

/**
 * Check if the current user has a specific role
 */
export const hasRole = (role: UserRole | UserRole[]): boolean => {
  const user = authService.getStoredUser()
  if (!user || !user.Roles) return false

  const roles = Array.isArray(role) ? role : [role]
  return roles.includes(user.Roles as UserRole)
}

/**
 * Check if the current user is an Admin
 */
export const isAdmin = (): boolean => {
  return hasRole('Admin')
}

/**
 * Check if the current user is a Pharmacist
 */
export const isPharmacist = (): boolean => {
  return hasRole('Pharmacist')
}

/**
 * Check if the current user is a Clerk
 */
export const isClerk = (): boolean => {
  return hasRole('Clerk')
}

/**
 * Check if the current user is Admin or Pharmacist
 */
export const isAdminOrPharmacist = (): boolean => {
  return hasRole(['Admin', 'Pharmacist'])
}

/**
 * Get the current user's role
 */
export const getCurrentRole = (): UserRole | null => {
  const user = authService.getStoredUser()
  return user?.Roles as UserRole || null
}

/**
 * Role-based permission definitions
 * Define what each role can do
 */
export const Permissions = {
  // User management permissions
  canCreateUser: () => isAdmin(),
  canUpdateUser: () => isAdmin(),
  canDeleteUser: () => isAdmin(),
  canViewUsers: () => isAdminOrPharmacist(),

  // Product/Inventory permissions
  canCreateProduct: () => isAdminOrPharmacist(),
  canUpdateProduct: () => isAdminOrPharmacist(),
  canDeleteProduct: () => isAdminOrPharmacist(),
  canViewProducts: () => isAdminOrPharmacist(),

  // Supplier permissions
  canCreateSupplier: () => isAdminOrPharmacist(),
  canUpdateSupplier: () => isAdminOrPharmacist(),
  canDeleteSupplier: () => isAdminOrPharmacist(),
  canViewSuppliers: () => isAdminOrPharmacist(),

  // Purchase Order permissions
  canCreatePurchaseOrder: () => isAdminOrPharmacist(),
  canUpdatePurchaseOrder: () => isAdminOrPharmacist(),
  canViewPurchaseOrders: () => isAdminOrPharmacist(),

  // Transaction permissions
  canViewTransactions: () => isAdminOrPharmacist(),

  // Report permissions
  canViewReports: () => isAdminOrPharmacist(),

  // Dashboard permissions
  canViewDashboard: () => isAdminOrPharmacist(),

  // Profile permissions
  canUpdateOwnProfile: () => true, // All authenticated users can update their own profile
} as const

/**
 * Higher-order function to wrap components/functions with permission check
 */
export const withPermission = <T extends (...args: any[]) => any>(
  permissionCheck: () => boolean,
  fn: T,
  fallback?: T
): T => {
  return ((...args: Parameters<T>): ReturnType<T> => {
    if (permissionCheck()) {
      return fn(...args)
    }
    return fallback ? fallback(...args) : (undefined as ReturnType<T>)
  }) as T
}

