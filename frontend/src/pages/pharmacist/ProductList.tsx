import { useEffect, useState } from 'react';
import { ProductItem } from '../../types/productItem';
import { fetchProductList } from '../../services/productItemService';
import { ProductListTable } from '../../components/ProductListTable';

export const ProductList = () => {
  const [productList, setproductList] = useState<ProductItem[]>([]);

  useEffect(() => {
    fetchProductList().then(setproductList);
  }, []);

  return (
    <div>
      <ProductListTable productList={productList} />
    </div>
  );
};
