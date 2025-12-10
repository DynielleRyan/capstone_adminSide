import { useEffect, useState, useCallback, useRef } from 'react';
import { ProductItem } from '../../types/productItem';
import { fetchProductList, ProductListResponse } from '../../services/productListService';
import { ProductListTable } from '../../components/ProductListTable';
import { Loader2 } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

export const ProductList = () => {
  const [productList, setproductList] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  
  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Use ref to prevent duplicate requests
  const isLoadingRef = useRef(false);

  const loadProductList = useCallback(async (page: number = 1, search?: string, sortBy?: string, sortOrder?: string) => {
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    try {
      // Fetch more items to account for grouping (each product might have multiple items)
      // We fetch 200 items per page to ensure we have enough groups to paginate
      const response: ProductListResponse = await fetchProductList({
        page,
        limit: 200, // Increased limit to cover multiple group pages
        search,
        sortBy: sortBy as 'Name' | 'Stock' | 'ExpiryDate' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        onlyActive: true
      });
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setproductList(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []); // Empty deps - function is stable

  useEffect(() => {
    isMountedRef.current = true;
    loadProductList();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - loadProductList is stable via useCallback

  return (
    <div className="p-6 space-y-8">
      {loading && productList.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-lg text-gray-600 font-medium">Loading products...</p>
        </div>
      ) : (
        <ProductListTable 
          productList={productList} 
          onRefresh={loadProductList}
          pagination={pagination}
          loading={loading}
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};
