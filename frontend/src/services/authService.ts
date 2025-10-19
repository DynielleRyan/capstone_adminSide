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
      
      // Clear localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      
      return response.data
    } catch (error: any) {
      // Clear localStorage even if request fails
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      
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

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token')
    return !!token
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

