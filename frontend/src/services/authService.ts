import api from './api'
import { UserResponse } from './userService'

export interface SignInCredentials {
  usernameOrEmail: string
  password: string
}

export interface SignInResponse {
  user: UserResponse
  session: {
    access_token: string
    refresh_token: string
    expires_in: number
    expires_at: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Auth Service Functions
export const authService = {
  // Sign in
  signIn: async (credentials: SignInCredentials): Promise<ApiResponse<SignInResponse>> => {
    try {
      const response = await api.post('/auth/signin', credentials)
      
      // Store token in localStorage
      if (response.data.success && response.data.data?.session) {
        localStorage.setItem('token', response.data.data.session.access_token)
        localStorage.setItem('refresh_token', response.data.data.session.refresh_token)
        localStorage.setItem('user', JSON.stringify(response.data.data.user))
        
        // Store expiration timestamp
        const expiresAt = response.data.data.session.expires_at || 
                         Math.floor(Date.now() / 1000) + response.data.data.session.expires_in
        localStorage.setItem('expires_at', expiresAt.toString())
      }
      
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to sign in')
    }
  },

  // Sign out
  signOut: async (): Promise<ApiResponse<void>> => {
    try {
      const response = await api.post('/auth/signout')
      
      // Clear authentication data
      authService.clearAuth()
      
      return response.data
    } catch (error: any) {
      // Clear authentication data even if request fails
      authService.clearAuth()
      
      throw new Error(error.response?.data?.message || 'Failed to sign out')
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get current user')
    }
  },

  // Refresh access token
  refreshToken: async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) return false

      const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
      
      if (response.data.success && response.data.data?.session) {
        localStorage.setItem('token', response.data.data.session.access_token)
        localStorage.setItem('refresh_token', response.data.data.session.refresh_token)
        
        // Store new expiration timestamp
        const expiresAt = response.data.data.session.expires_at || 
                         Math.floor(Date.now() / 1000) + response.data.data.session.expires_in
        localStorage.setItem('expires_at', expiresAt.toString())
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  },

  // Check if token is expired
  isTokenExpired: (): boolean => {
    const expiresAtStr = localStorage.getItem('expires_at')
    if (!expiresAtStr) return true

    try {
      const expiresAt = parseInt(expiresAtStr)
      const now = Math.floor(Date.now() / 1000) // Current time in seconds
      // Consider token expired if it expires in the next 60 seconds
      return expiresAt <= now + 60
    } catch (error) {
      return true
    }
  },

  // Clear authentication data
  clearAuth: (): void => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('expires_at')
  },

  // Check if user is authenticated with proper validation
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token')
    
    // No token exists
    if (!token) {
      authService.clearAuth()
      return false
    }

    // Check if token is expired
    if (authService.isTokenExpired()) {
      authService.clearAuth()
      return false
    }

    return true
  },

  // Validate and refresh token if needed
  validateAndRefreshToken: async (): Promise<boolean> => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      authService.clearAuth()
      return false
    }

    // If token is expired, try to refresh it
    if (authService.isTokenExpired()) {
      const refreshed = await authService.refreshToken()
      if (!refreshed) {
        authService.clearAuth()
        return false
      }
      return true
    }

    return true
  },

  // Get stored user
  getStoredUser: (): UserResponse | null => {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr)
    } catch (error) {
      return null
    }
  },

  // Get stored token
  getToken: (): string | null => {
    return localStorage.getItem('token')
  }
}

export default authService
