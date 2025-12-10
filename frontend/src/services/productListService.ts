import api from './api';
import { ProductItem } from '../types/productItem';

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minStock?: number;
  maxStock?: number;
  sortBy?: 'Name' | 'Stock' | 'ExpiryDate';
  sortOrder?: 'asc' | 'desc';
  onlyActive?: boolean;
}

export interface ProductListResponse {
  data: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const fetchProductList = async (params?: ProductListParams): Promise<ProductListResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.brand) queryParams.append('brand', params.brand);
    if (params?.minStock !== undefined) queryParams.append('minStock', params.minStock.toString());
    if (params?.maxStock !== undefined) queryParams.append('maxStock', params.maxStock.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.onlyActive !== undefined) queryParams.append('onlyActive', params.onlyActive.toString());

    const response = await api.get<ProductListResponse>(`/product-list?${queryParams.toString()}`);
    return response.data;
  };


export const fetchProductItemByID = async (id: string): Promise<ProductItem> => {
  const response = await api.get(`/product-list/${id}`);
  return response.data;
};

export const deleteProductItemByID = async (id: string): Promise<string> => {
  const response = await api.patch(`/product-list/${id}`, { IsActive: false });
  return response.data.message || 'Product deleted successfully';
};


