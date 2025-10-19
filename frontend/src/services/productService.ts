import api from './api'

export interface Product {
  id: number
  name: string
  category: string
  stock: number
  price: number
  description?: string
  sku?: string
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
  // Get all products
  getProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products')
    return response.data
  },

  // Get product by ID
  getProduct: async (id: number): Promise<Product> => {
    const response = await api.get(`/products/${id}`)
    return response.data
  },

  // Create new product
  createProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const response = await api.post('/products', product)
    return response.data
  },

  // Update product
  updateProduct: async (id: number, product: Partial<Product>): Promise<Product> => {
    const response = await api.put(`/products/${id}`, product)
    return response.data
  },

  // Delete product
  deleteProduct: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`)
  },

  // Search products
  searchProducts: async (query: string): Promise<Product[]> => {
    const response = await api.get(`/products/search?q=${encodeURIComponent(query)}`)
    return response.data
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
}
