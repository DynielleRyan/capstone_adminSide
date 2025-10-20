import api from './api'

// Types for supplier operations
export interface Supplier {
  SupplierID?: string
  Name: string
  ContactPerson?: string
  ContactNumber?: string
  Email?: string
  Address?: string
  Remarks?: string
  IsActiveYN?: boolean
  CreatedAt?: Date
  UpdatedAt?: Date
}

export interface CreateSupplier {
  Name: string
  ContactPerson?: string
  ContactNumber?: string
  Email?: string
  Address?: string
  Remarks?: string
  IsActiveYN?: boolean
}

export interface UpdateSupplier {
  SupplierID: string
  Name?: string
  ContactPerson?: string
  ContactNumber?: string
  Email?: string
  Address?: string
  Remarks?: string
  IsActiveYN?: boolean
  UpdatedAt?: Date
}

export interface SupplierResponse {
  SupplierID?: string
  Name: string
  ContactPerson?: string
  ContactNumber?: string
  Email?: string
  Address?: string
  Remarks?: string
  IsActiveYN?: boolean
  CreatedAt?: Date
  UpdatedAt?: Date
}

export interface SupplierFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export interface PaginatedSuppliers {
  suppliers: SupplierResponse[]
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

// Supplier Service Functions
export const supplierService = {
  // Create a new supplier
  createSupplier: async (supplierData: CreateSupplier): Promise<ApiResponse<SupplierResponse>> => {
    try {
      const response = await api.post('/suppliers', supplierData)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create supplier')
    }
  },

  // Get all suppliers with pagination and filtering
  getSuppliers: async (filters?: SupplierFilters): Promise<ApiResponse<PaginatedSuppliers>> => {
    try {
      const params = new URLSearchParams()
      
      if (filters?.search) params.append('search', filters.search)
      if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive))
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const response = await api.get(`/suppliers?${params.toString()}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch suppliers')
    }
  },

  // Get supplier by ID
  getSupplierById: async (supplierId: string): Promise<ApiResponse<SupplierResponse>> => {
    try {
      const response = await api.get(`/suppliers/${supplierId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch supplier')
    }
  },

  // Update supplier
  updateSupplier: async (supplierId: string, supplierData: UpdateSupplier): Promise<ApiResponse<SupplierResponse>> => {
    try {
      const response = await api.put(`/suppliers/${supplierId}`, supplierData)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update supplier')
    }
  },

  // Delete supplier
  deleteSupplier: async (supplierId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/suppliers/${supplierId}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete supplier')
    }
  }
}

export default supplierService
