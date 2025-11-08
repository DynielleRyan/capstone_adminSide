import api from './api';

// Product Item interfaces
export interface ProductItem {
  ProductItemID?: string;
  ProductID: string;
  UserID: string;
  Stock: number;
  ExpiryDate?: string;
  BatchNumber?: string;
  Location?: string;
  DateTimeLastUpdate?: Date;
  IsActive?: boolean;
  CreatedAt?: Date;
}

export interface CreateProductItemData {
  ProductID: string;
  UserID: string;
  Stock: number;
  ExpiryDate?: string;
  BatchNumber?: string;
  Location?: string;
  IsActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedProductItems {
  productItems: ProductItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductItemFilters {
  productId?: string;
  userId?: string;
  isActive?: boolean;
  expiryBefore?: string;
  expiryAfter?: string;
  minStock?: number;
  maxStock?: number;
  location?: string;
  page?: number;
  limit?: number;
}

export const productItemService = {
  // Get all product items with pagination and filters
  getProductItems: async (params?: ProductItemFilters): Promise<PaginatedProductItems> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.productId) queryParams.append('productId', params.productId);
      if (params?.userId) queryParams.append('userId', params.userId);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.expiryBefore) queryParams.append('expiryBefore', params.expiryBefore);
      if (params?.expiryAfter) queryParams.append('expiryAfter', params.expiryAfter);
      if (params?.minStock !== undefined) queryParams.append('minStock', params.minStock.toString());
      if (params?.maxStock !== undefined) queryParams.append('maxStock', params.maxStock.toString());
      if (params?.location) queryParams.append('location', params.location);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      
      const queryString = queryParams.toString();
      const url = queryString ? `/product-items?${queryString}` : '/product-items';
      
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product items');
    }
  },

  // Get product item by ID
  getProductItem: async (id: string): Promise<ApiResponse<ProductItem>> => {
    try {
      const response = await api.get(`/product-items/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product item');
    }
  },

  // Get product items by product ID
  getProductItemsByProductId: async (productId: string): Promise<ApiResponse<ProductItem[]>> => {
    try {
      const response = await api.get(`/product-items/product/${productId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product items');
    }
  },

  // Create new product item
  createProductItem: async (productItem: CreateProductItemData): Promise<ApiResponse<ProductItem>> => {
    try {
      const response = await api.post('/product-items', productItem);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create product item');
    }
  },

  // Update product item
  updateProductItem: async (id: string, productItem: Partial<ProductItem>): Promise<ApiResponse<ProductItem>> => {
    try {
      const response = await api.put(`/product-items/${id}`, productItem);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update product item');
    }
  },

  // Delete product item
  deleteProductItem: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await api.delete(`/product-items/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete product item');
    }
  },

  // Get low stock items
  getLowStockItems: async (threshold?: number): Promise<ApiResponse<ProductItem[]>> => {
    try {
      const params = threshold ? `?threshold=${threshold}` : '';
      const response = await api.get(`/product-items/low-stock${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch low stock items');
    }
  },

  // Get expiring items
  getExpiringItems: async (days?: number): Promise<ApiResponse<ProductItem[]>> => {
    try {
      const params = days ? `?days=${days}` : '';
      const response = await api.get(`/product-items/expiring${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch expiring items');
    }
  }
};

