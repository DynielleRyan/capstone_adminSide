import api from './api'

export interface Order {
  id: string
  customerId: number
  customerName: string
  date: string
  total: number
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled'
  items: OrderItem[]
}

export interface OrderItem {
  productId: number
  productName: string
  quantity: number
  price: number
}

export const orderService = {
  // Get all orders
  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders')
    return response.data
  },

  // Get order by ID
  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`)
    return response.data
  },

  // Update order status
  updateOrderStatus: async (id: string, status: Order['status']): Promise<Order> => {
    const response = await api.put(`/orders/${id}/status`, { status })
    return response.data
  },

  // Get orders by status
  getOrdersByStatus: async (status: Order['status']): Promise<Order[]> => {
    const response = await api.get(`/orders?status=${status}`)
    return response.data
  },

  // Search orders
  searchOrders: async (query: string): Promise<Order[]> => {
    const response = await api.get(`/orders/search?q=${encodeURIComponent(query)}`)
    return response.data
  },
}
