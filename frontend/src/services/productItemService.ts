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
