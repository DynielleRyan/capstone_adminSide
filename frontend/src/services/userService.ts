import api from './api'

// User role type based on schema constraint (Admin excluded from frontend)
export type UserRole = 'Pharmacist' | 'Clerk';

// Types for user operations
export interface User {
  UserID?: string
  FirstName: string
  MiddleInitial?: string
  LastName: string
  Username: string
  Email: string
  Address?: string
  ContactNumber?: string
  DateTimeLastLoggedIn?: Date
  Roles: UserRole
  CreatedAt?: Date
  UpdatedAt?: Date
  AuthUserID?: string
}

export interface CreateUser {
  FirstName: string
  MiddleInitial?: string
  LastName: string
  Username: string
  Email: string
  Password: string
  Address?: string
  ContactNumber?: string
  Roles?: UserRole // Defaults to 'Pharmacist' in backend
}

export interface UpdateUser {
  UserID: string
  FirstName?: string
  MiddleInitial?: string
  LastName?: string
  Username?: string
  Email?: string
  Address?: string
  ContactNumber?: string
  DateTimeLastLoggedIn?: Date
  Roles?: UserRole
  UpdatedAt?: Date
}

export interface UpdateProfile {
  UserID: string
  FirstName?: string
  MiddleInitial?: string
  LastName?: string
  Email?: string
  Address?: string
  ContactNumber?: string
}

export interface UserResponse {
  UserID?: string
  FirstName: string
  MiddleInitial?: string
  LastName: string
  Username: string
  Email: string
  Address?: string
  ContactNumber?: string
  DateTimeLastLoggedIn?: Date
  Roles: UserRole
  CreatedAt?: Date
  UpdatedAt?: Date
  AuthUserID?: string
}

export interface UserWithPharmacist extends UserResponse {
  Pharmacist?: {
    PharmacistID: string
    LicenseNumber?: string
    Specialization?: string
    YearsOfExperience?: number
    IsActive: boolean
    CreatedAt: Date
  }
}

export interface UserFilters {
  search?: string
  pharmacistYN?: boolean // Keep for backwards compatibility
  role?: UserRole // New role-based filtering (Admin excluded)
  page?: number
  limit?: number
}

export interface PaginatedUsers {
  users: UserResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// User Service Functions
export const userService = {
  // Create a new user
  createUser: async (userData: CreateUser): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.post('/users', userData)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create user')
    }
  },

  // Get all users with pagination and filtering
  getUsers: async (filters?: UserFilters): Promise<ApiResponse<PaginatedUsers>> => {
    try {
      const params = new URLSearchParams()
      
      if (filters?.search) params.append('search', filters.search)
      if (filters?.role) params.append('role', filters.role)
      if (filters?.pharmacistYN !== undefined) params.append('pharmacistYN', String(filters.pharmacistYN))
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const response = await api.get(`/users?${params.toString()}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users')
    }
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.get(`/users/${userId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user')
    }
  },

  // Update user
  updateUser: async (userId: string, userData: UpdateUser): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.put(`/users/${userId}`, userData)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user')
    }
  },

  // Delete user (soft delete)
  deleteUser: async (userId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/users/${userId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete user')
    }
  },

  // Update user profile (excluding sensitive fields)
  updateProfile: async (userId: string, profileData: UpdateProfile): Promise<ApiResponse<UserResponse>> => {
    try {
      const response = await api.put(`/users/${userId}/profile`, profileData)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile')
    }
  },

  // Get user with pharmacist information
  getUserWithPharmacist: async (userId: string): Promise<ApiResponse<UserWithPharmacist>> => {
    try {
      const response = await api.get(`/users/${userId}/pharmacist`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user with pharmacist info')
    }
  }
}

export default userService
