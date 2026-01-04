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
    limit: 5,
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
      // Fetch first page with limit 100 for faster initial load
      const firstPageResponse: ProductListResponse = await fetchProductList({
        page: 1,
        limit: 100, // Fetch 100 items per page
        search,
        sortBy: sortBy as 'Name' | 'Stock' | 'ExpiryDate' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        onlyActive: true
      });
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        isLoadingRef.current = false;
        return;
      }
      
      // Show first page immediately for better perceived performance
      setproductList(firstPageResponse.data);
      setPagination(firstPageResponse.pagination);
      setLoading(false); // Allow UI to show first batch
      
      // If there are more pages, fetch them sequentially
      const totalPages = firstPageResponse.pagination.totalPages;
      if (totalPages > 1) {
        const allProducts: ProductItem[] = [...firstPageResponse.data];
        
        // Fetch remaining pages sequentially
        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
          // Check if component is still mounted before each request
          if (!isMountedRef.current) break;
          
          const pageResponse: ProductListResponse = await fetchProductList({
            page: currentPage,
            limit: 100,
            search,
            sortBy: sortBy as 'Name' | 'Stock' | 'ExpiryDate' | undefined,
            sortOrder: sortOrder as 'asc' | 'desc' | undefined,
            onlyActive: true
          });
          
          // Only update if still mounted
          if (isMountedRef.current) {
            allProducts.push(...pageResponse.data);
            // Update state progressively as we load more pages
            setproductList([...allProducts]);
          }
        }
        
        // Final update with all products
        if (isMountedRef.current) {
          setproductList(allProducts);
          setPagination({
            ...firstPageResponse.pagination,
            total: allProducts.length
          });
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
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
