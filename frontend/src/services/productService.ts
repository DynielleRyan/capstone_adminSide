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
}
