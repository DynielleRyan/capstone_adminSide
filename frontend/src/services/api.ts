import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { activityService } from './activityService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Helper to get the appropriate storage (same as authService)
const getStorage = (): Storage => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  return rememberMe ? localStorage : sessionStorage
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const storage = getStorage()
    const token = storage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || ''
      
      // If the error is "Invalid or expired token" and we haven't retried yet
      if (
        (errorMessage.includes('Invalid or expired token') || 
         errorMessage.includes('No authorization token provided')) &&
        !originalRequest._retry
      ) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return api(originalRequest)
            })
            .catch((err) => {
              return Promise.reject(err)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        const storage = getStorage()
        const refreshToken = storage.getItem('refresh_token')

        if (!refreshToken) {
          // No refresh token, clear auth and redirect to login
          clearAuthAndRedirect()
          return Promise.reject(error)
        }

        try {
          // Try to refresh the token
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          if (response.data.success && response.data.data?.session) {
            const newToken = response.data.data.session.access_token
            storage.setItem('token', newToken)
            storage.setItem('refresh_token', response.data.data.session.refresh_token)

            const expiresAt =
              response.data.data.session.expires_at ||
              Math.floor(Date.now() / 1000) + response.data.data.session.expires_in
            storage.setItem('expires_at', expiresAt.toString())

            // Update the authorization header
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
            originalRequest.headers.Authorization = `Bearer ${newToken}`

            processQueue(null, newToken)

            // Retry the original request
            return api(originalRequest)
          } else {
            // Refresh failed
            processQueue(new Error('Token refresh failed'), null)
            clearAuthAndRedirect()
            return Promise.reject(error)
          }
        } catch (refreshError) {
          // Refresh failed
          processQueue(refreshError as Error, null)
          clearAuthAndRedirect()
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      } else {
        // Other 401 errors or already retried - clear auth and redirect
        clearAuthAndRedirect()
      }
    }

    // Handle 403 Forbidden errors (insufficient permissions)
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || 'You do not have permission to perform this action'
      console.error('Permission denied:', errorMessage)
      
      // You can show a toast/notification here
      // For now, just reject with a clear message
      return Promise.reject(new Error(errorMessage))
    }

    // Handle other errors
    return Promise.reject(error)
  }
)

// Helper function to clear auth data and redirect to login
const clearAuthAndRedirect = () => {
  // Clean up activity tracking
  activityService.cleanup()
  activityService.clearActivity()
  
  // Clear auth data from both storages
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  localStorage.removeItem('expires_at')
  localStorage.removeItem('rememberMe')
  
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('user')
  sessionStorage.removeItem('expires_at')
  
  // Only redirect if not already on login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export default api