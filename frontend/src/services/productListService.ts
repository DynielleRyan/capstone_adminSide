import api from './api';
import { ProductItem } from '../types/productItem';


export const fetchProductList = async (): Promise<ProductItem[]> => {
    const response = await api.get('/product-list');
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


