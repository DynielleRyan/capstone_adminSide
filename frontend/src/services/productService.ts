import api from './api';
import { Product } from '../types/product';

export const fetchProducts = async (): Promise<Product[]> => {
  const response = await api.get('/purchase-orders/products');
  return response.data;
};
