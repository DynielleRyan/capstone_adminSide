import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[] // Optional: specify which roles can access this route
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const location = useLocation()
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First, do a quick check
        const quickCheck = authService.isAuthenticated()
        
        if (!quickCheck) {
          setIsAuthenticated(false)
          setIsAuthenticating(false)
          return
        }

        // If quick check passes, validate and potentially refresh token
        const isValid = await authService.validateAndRefreshToken()
        setIsAuthenticated(isValid)

        // Check role-based permissions if required
        if (isValid && requiredRoles && requiredRoles.length > 0) {
          const user = authService.getStoredUser()
          if (user && user.Roles) {
            // Check if user's role is in the required roles list
            const userHasRole = requiredRoles.includes(user.Roles)
            setHasPermission(userHasRole)
          } else {
            setHasPermission(false)
          }
        } else {
          // No specific role required, or user is valid
          setHasPermission(true)
        }
      } catch (error) {
        console.error('Authentication check failed:', error)
        setIsAuthenticated(false)
        setHasPermission(false)
      } finally {
        setIsAuthenticating(false)
      }
    }

    checkAuth()
  }, [requiredRoles])

  // Show loading state while checking authentication
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!hasPermission) {
    // User is authenticated but doesn't have the required role
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You do not have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute

