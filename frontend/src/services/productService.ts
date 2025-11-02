import api from './api';

// Full Product interface matching backend schema
export interface Product {
  ProductID?: string
  UserID: string
  SupplierID: string
  Name: string
  GenericName?: string
  Category: string
  Brand?: string
  Image?: string | null
  SellingPrice: number
  IsVATExemptYN: boolean
  VATAmount: number
  PrescriptionYN: boolean
  IsActive: boolean
  CreatedAt?: Date
  UpdatedAt?: Date
}

// Product creation payload
export interface CreateProductData {
  UserID: string
  SupplierID: string
  Name: string
  GenericName?: string | null
  Category: string
  Brand?: string | null
  Image?: string | null
  SellingPrice: number
  IsVATExemptYN: boolean
  VATAmount: number
  PrescriptionYN: boolean
  IsActive: boolean
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export interface PaginatedProducts {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductSourceItem {
  ProductID: string
  ProductName: string
  ProductImage?: string
  SupplierID: string
  SupplierName: string
  ContactNumber?: string
  TotalStock?: number
  LastPurchaseDate?: string
}

export interface PaginatedProductSource {
  products: ProductSourceItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductSourceListParams {
  search?: string
  page?: number
  limit?: number
  sortBy?: 'ProductName' | 'SupplierName' | 'LastPurchaseDate'
}

export const productService = {
  // Get all products with pagination and filters
  getProducts: async (params?: {
    search?: string
    page?: number
    limit?: number
    isActive?: boolean
  }): Promise<ApiResponse<PaginatedProducts>> => {
    try {
      const queryParams = new URLSearchParams()
      
      if (params?.search) queryParams.append('search', params.search)
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
      
      const queryString = queryParams.toString()
      const url = queryString ? `/products?${queryString}` : '/products'
      
      const response = await api.get(url)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch products')
    }
  },

  // Get product by ID
  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    try {
      const response = await api.get(`/products/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product')
    }
  },

  // Create new product
  createProduct: async (product: CreateProductData): Promise<ApiResponse<Product>> => {
    try {
      const response = await api.post('/products', product)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create product')
    }
  },

  // Update product
  updateProduct: async (id: string, product: Partial<Product>): Promise<ApiResponse<Product>> => {
    try {
      const response = await api.put(`/products/${id}`, product)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update product')
    }
  },

  // Delete product
  deleteProduct: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/products/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete product')
    }
  },

  // Search products
  searchProducts: async (query: string): Promise<ApiResponse<Product[]>> => {
    try {
      const response = await api.get(`/products/search?q=${encodeURIComponent(query)}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search products')
    }
  },

  // Get product statistics for dashboard
  getProductStats: async (): Promise<ApiResponse<{
    totalProducts: number
    lowStockCount: number
    expiredCount: number
    categoriesCount: number
  }>> => {
    try {
      const response = await api.get('/products/stats')
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product statistics')
    }
  },

  // Get product source list with supplier info and purchase history
  getProductSourceList: async (params?: ProductSourceListParams): Promise<PaginatedProductSource> => {
    const queryParams = new URLSearchParams()
    
    if (params?.search) queryParams.append('search', params.search)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    
    const queryString = queryParams.toString()
    const url = queryString ? `/products/source-list?${queryString}` : '/products/source-list'
    
    const response = await api.get(url)
    return response.data
  },

  // Upload product image
  uploadImage: async (file: File, base64Data: string): Promise<ApiResponse<{ imageUrl: string }>> => {
    try {
      const response = await api.post('/products/upload-image', {
        imageData: base64Data,
        fileName: file.name,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload image')
    }
  },
}

