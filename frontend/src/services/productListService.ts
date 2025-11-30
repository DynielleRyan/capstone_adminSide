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

export const searchProductByName = async (name: string): Promise<ProductItem[]> => {
  const response = await api.get('/product-list');
  const allProducts: ProductItem[] = response.data;
  
  // Filter products by name (case-insensitive)
  const searchTerm = name.toLowerCase().trim();
  return allProducts.filter(item => 
    item.Product.Name.toLowerCase().includes(searchTerm)
  );
};