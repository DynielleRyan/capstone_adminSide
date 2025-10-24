import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation()
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
      } catch (error) {
        console.error('Authentication check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setIsAuthenticating(false)
      }
    }

    checkAuth()
  }, [])

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

  return <>{children}</>
}

export default ProtectedRoute

