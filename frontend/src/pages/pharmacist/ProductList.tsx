import { useEffect, useState } from 'react';
import { ProductItem } from '../../types/productItem';
import { fetchProductList } from '../../services/productListService';
import { ProductListTable } from '../../components/ProductListTable';

export const ProductList = () => {
  const [productList, setproductList] = useState<ProductItem[]>([]);

  useEffect(() => {
    fetchProductList().then(setproductList);
  }, []);

  return (
    <div className="p-6 space-y-8">
      <ProductListTable productList={productList} />
    </div>
  );
};
