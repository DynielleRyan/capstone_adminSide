import { useEffect, useState } from 'react';
import { ProductItem } from '../../types/productItem';
import { fetchProductList } from '../../services/productListService';
import { ProductListTable } from '../../components/ProductListTable';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

export const ProductList = () => {
  const [productList, setproductList] = useState<ProductItem[]>([]);

  useEffect(() => {
    fetchProductList().then(setproductList);
  }, []);

  return (
    <div className="p-6 space-y-8">
      <ProductListTable productList={productList} />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};
