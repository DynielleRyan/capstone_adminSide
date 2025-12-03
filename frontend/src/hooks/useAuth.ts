import { useState, useEffect } from 'react'
import { authService, type ApiResponse } from '../services/authService'
import { UserResponse } from '../services/userService'

// Helper to get the appropriate storage
const getStorage = (): Storage => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  return rememberMe ? localStorage : sessionStorage
}

export interface UseAuthReturn {
  user: UserResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  hasRole: (roles: string | string[]) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasAllRoles: (roles: string[]) => boolean
  isAdmin: boolean
  isPharmacist: boolean
  isClerk: boolean
  refreshUser: () => Promise<void>
}

/**
 * Custom hook for authentication and authorization
 * Provides user information, authentication status, and role checking utilities
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from local storage or fetch from API
  const loadUser = async () => {
    try {
      setIsLoading(true)

      // Check if user is authenticated
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        // Try to get user from local storage first
        const storedUser = authService.getStoredUser()
        
        if (storedUser) {
          setUser(storedUser)
        } else {
          // If not in storage, fetch from API
          try {
            const response: ApiResponse<UserResponse> = await authService.getCurrentUser()
            if (response.success && response.data) {
              setUser(response.data)
              // Store in appropriate storage for next time
              const storage = getStorage()
              storage.setItem('user', JSON.stringify(response.data))
            }
          } catch (error) {
            console.error('Failed to fetch user:', error)
            setUser(null)
            setIsAuthenticated(false)
          }
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh user data from API
  const refreshUser = async () => {
    try {
      const response: ApiResponse<UserResponse> = await authService.getCurrentUser()
      if (response.success && response.data) {
        setUser(response.data)
        const storage = getStorage()
        storage.setItem('user', JSON.stringify(response.data))
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  // Check if user has a specific role or any of the specified roles
  const hasRole = (roles: string | string[]): boolean => {
    if (!user || !user.Roles) return false
    
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.Roles)
  }

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    return hasRole(roles)
  }

  // Check if user has all of the specified roles (for single role system, same as hasRole)
  const hasAllRoles = (roles: string[]): boolean => {
    if (!user || !user.Roles) return false
    return roles.includes(user.Roles)
  }

  // Convenience computed values
  const isAdmin = user?.Roles === 'Admin'
  const isPharmacist = user?.Roles === 'Pharmacist'
  const isClerk = user?.Roles === 'Clerk'

  // Load user on mount
  useEffect(() => {
    loadUser()
  }, [])

  return {
    user,
    isAuthenticated,
    isLoading,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isPharmacist,
    isClerk,
    refreshUser,
  }
}

export default useAuth

