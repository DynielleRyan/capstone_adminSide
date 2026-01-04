import { useMemo, useState, useEffect, useRef } from 'react';
import { ProductItem } from '../types/productItem';
import { fetchProductItemByID, deleteProductItemByID } from '../services/productListService';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Eye, PenSquare, Trash2, X, Loader2,   } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  productList: ProductItem[];
  onRefresh?: (page?: number, search?: string, sortBy?: string, sortOrder?: string) => void | Promise<void>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading?: boolean;
}

export const ProductListTable : React.FC<Props> = ({ productList, onRefresh, pagination, loading }) => {
  const [selectedProductItem, setSelectedProductItem] = useState<ProductItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('Name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [DeleteItem, setDeleteItem] = useState<ProductItem | null>(null);
  const [previewData, setPreviewData] = useState<{
    rows: any[];
    filename: string;
    isOpen: boolean;
  } | null>(null);
  
  // Separate state for item page (server-side pagination) vs currentPage (group pagination)
  const [itemPage, setItemPage] = useState(pagination?.page || 1);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Track previous item page to detect when we've loaded a new item page
  const prevItemPageRef = useRef(pagination?.page || 1);
  // Track if this is the initial mount (shared between useEffects)
  const isInitialMount = useRef(true);
  // Track if we should skip the next fetch (to prevent loops)
  const skipNextFetchRef = useRef(false);
  // Track previous values to detect actual changes
  const prevSearchRef = useRef(debouncedSearchTerm);
  const prevSortRef = useRef(`${sortBy}-${sortOrder}`);
  const prevItemPageForFetchRef = useRef(itemPage);
  
  // Only reset group page when we load a NEW item page (not when paginating groups)
  useEffect(() => {
    const currentItemPage = pagination?.page || 1;
    // Skip on initial mount
    if (isInitialMount.current) {
      prevItemPageRef.current = currentItemPage;
      prevItemPageForFetchRef.current = itemPage;
      return;
    }
    
    // Only reset if we've actually changed item pages (not just group pages)
    if (currentItemPage !== prevItemPageRef.current) {
      setCurrentPage(1); // Reset to first group page when new item page loads
      prevItemPageRef.current = currentItemPage;
      // Sync itemPage state but skip the fetch (data already loaded)
      skipNextFetchRef.current = true;
      setItemPage(currentItemPage);
      prevItemPageForFetchRef.current = currentItemPage;
    }
  }, [pagination?.page, itemPage]);
  
  // Trigger refresh when sort, search, or page changes
  // Search and pagination are now handled at the backend level
  useEffect(() => {
    if (!onRefresh) return;
    
    // Mark initial mount as complete after first render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSearchRef.current = debouncedSearchTerm;
      prevSortRef.current = `${sortBy}-${sortOrder}`;
      prevItemPageForFetchRef.current = itemPage;
      return;
    }
    
    // Skip if this fetch should be skipped (e.g., when syncing from pagination prop)
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      prevItemPageForFetchRef.current = itemPage;
      return;
    }
    
    // Check if anything changed
    const sortChanged = prevSortRef.current !== `${sortBy}-${sortOrder}`;
    const itemPageChanged = prevItemPageForFetchRef.current !== itemPage;
    const searchChanged = prevSearchRef.current !== debouncedSearchTerm;
    
    if (!sortChanged && !itemPageChanged && !searchChanged) {
      return; // No changes, skip fetch
    }
    
    // Update refs
    prevSortRef.current = `${sortBy}-${sortOrder}`;
    prevItemPageForFetchRef.current = itemPage;
    prevSearchRef.current = debouncedSearchTerm;
    
    let isCancelled = false;
    const sortByValue = sortBy === 'none' ? 'Name' : sortBy;
    
    const fetchData = async () => {
      if (!isCancelled) {
        // Pass search term to backend for server-side filtering
        await onRefresh(itemPage, debouncedSearchTerm || undefined, sortByValue, sortOrder);
      }
    };
    
    fetchData();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder, itemPage, debouncedSearchTerm]); // Include debouncedSearchTerm - search is now server-side

  // Delete product item from list
  const handleDeleteConfirmed = async () => {
    if (!DeleteItem) return;
    try {
      const message = await deleteProductItemByID(DeleteItem.ProductItemID);
      toast.success(message);
      setDeleteItem(null);
      const modal = document.getElementById('delete_modal') as HTMLDialogElement;
      modal?.close();
      
      // Auto-refresh the product list
      if (onRefresh) {
        const sortByValue = sortBy === 'none' ? 'Name' : sortBy;
        // Pass search term to backend
        await onRefresh(itemPage, debouncedSearchTerm || undefined, sortByValue, sortOrder);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete product');
    }
  };
   
  // View product details
  const handleView = async (id: string) => {
    const result = await fetchProductItemByID(id);
    if (!result) {
      setErrorMessage('Product not found or failed to load.');
      setSelectedProductItem(null);
    } else {
      setSelectedProductItem(result);
      setErrorMessage(null);
    };
    
    

    const modal = document.getElementById('product_modal') as HTMLDialogElement;
    modal?.showModal();
  };


  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === 'none') {
      setSortBy('Name');
      setSortOrder('asc');
    } else if (newSortBy === 'stock-asc') {
      setSortBy('Stock');
      setSortOrder('asc');
    } else if (newSortBy === 'stock-desc') {
      setSortBy('Stock');
      setSortOrder('desc');
    } else if (newSortBy === 'date-asc') {
      setSortBy('ExpiryDate');
      setSortOrder('asc');
    } else if (newSortBy === 'date-desc') {
      setSortBy('ExpiryDate');
      setSortOrder('desc');
    } else {
      setSortBy('Name');
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first group page on sort change
    setItemPage(1); // Reset to first item page on sort change
  };

  // Determine danger level of expiry date
  function getExpiryColor(expiryDate: string): string {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMonths =
      (expiry.getFullYear() - now.getFullYear()) * 12 +
      (expiry.getMonth() - now.getMonth());
  
    if (diffMonths <= 3) return 'bg-red-100 text-red-800';
    if (diffMonths <= 6) return 'bg-yellow-100 text-yellow-800';
    return '';
  };
  
  // Generate report with preview
  const handleGenerateReport = () => {
    // Prepare CSV data with all Product List table fields
    const rows = productList.map(item => {
      const row: Record<string, string | number | boolean> = {
        Name: item.Product.Name,
        Stock: item.Stock,
        ExpiryDate: item.ExpiryDate,
        Category: item.Product.Category,
        Brand: item.Product.Brand,
        SellingPrice: item.Product.SellingPrice,
      };
      return row;
    });
    
    const filename = `product_list_${new Date().toISOString().split("T")[0]}.csv`;
    setPreviewData({
      rows,
      filename,
      isOpen: true,
    });
  };

  // Download CSV helper
  const downloadCSV = (filename: string, rows: Record<string, any>[]) => {
    if (!rows?.length) return;
    
    const validRows = rows.filter(row => {
      if (!row || typeof row !== 'object') return false;
      const keys = Object.keys(row);
      return keys.length > 0 && keys.some(key => row[key] !== undefined && row[key] !== null && row[key] !== "");
    });
    
    if (validRows.length === 0) {
      toast.warning("No valid rows to export");
      return;
    }
    
    const allHeaders = new Set<string>();
    validRows.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== "") allHeaders.add(key);
      });
    });
    
    const headers = Array.from(allHeaders);
    if (headers.length === 0) {
      toast.warning("No headers found");
      return;
    }
    
    const csv = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...validRows.map((r) => 
        headers.map((h) => {
          const value = r[h];
          if (value === null || value === undefined || value === "") return "";
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      ),
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  // Confirm and download report
  const confirmDownloadReport = () => {
    if (!previewData || previewData.rows.length === 0) {
      toast.warning("No report data to download.");
      return;
    }
    downloadCSV(previewData.filename, previewData.rows);
    toast.success("Report downloaded successfully!");
    setPreviewData(null);
  };

  // Close preview
  const closePreview = () => {
    setPreviewData(null);
  };
  
  // Group product items based on their ProductID (client-side grouping for display)
  // Note: Search filtering is now done at the backend level
  const groupedProducts = useMemo(() => {
    // Product item will only be displayed if it satisfies the condition
    let validItems = productList.filter(
      item => item.IsActive === true && item.Stock > 0
    );

    // No need for client-side search filtering - it's handled by the backend

    // Groups product items based on their ProductID
    const grouped: Record<string, ProductItem[]> = {};
    
    validItems.forEach(item => {
      const productId = item.ProductID;
      if (!grouped[productId]) grouped[productId] = [];
      grouped[productId].push(item);
    });

    // Sort each product group from earliest to latest expiry
    Object.values(grouped).forEach(group => {
      group.sort((a, b) => new Date(a.ExpiryDate).getTime() - new Date(b.ExpiryDate).getTime());
    });

    return grouped;
  }, [productList]); // Removed debouncedSearchTerm - search is now server-side

  // Client-side pagination for grouped products (since we're grouping on the frontend)
  const currentGroupCount = Object.keys(groupedProducts).length;
  const currentGroupPages = Math.ceil(currentGroupCount / itemsPerPage);
  
  // Calculate total pages: 
  // - If we have pagination info and more item pages, estimate total groups
  // - Otherwise, use current group pages
  let totalPages = currentGroupPages;
  
  if (pagination && pagination.total > 0) {
    // Estimate: if we have X groups from Y items, estimate total groups from total items
    // This is an approximation since grouping depends on product structure
    const itemsPerGroup = currentGroupCount > 0 ? productList.length / currentGroupCount : 1;
    const estimatedTotalGroups = Math.ceil(pagination.total / itemsPerGroup);
    const estimatedTotalGroupPages = Math.ceil(estimatedTotalGroups / itemsPerPage);
    
    // Use the larger of: current pages or estimated pages
    totalPages = Math.max(currentGroupPages, estimatedTotalGroupPages);
    
    // If there are more item pages to load, add 1 to indicate more available
    if (pagination.page < pagination.totalPages) {
      totalPages = Math.max(totalPages, currentGroupPages + 1);
    }
  }

  // Count products for pagination per ProductID, not per product item
  const groupedEntries = useMemo(() => {
    const entries = Object.entries(groupedProducts); 
    const start = (currentPage - 1) * itemsPerPage;
    return entries.slice(start, start + itemsPerPage);
  }, [groupedProducts, currentPage]);


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-blue-900">PRODUCTS</h1>
          {/* Compact Legend */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Expiry:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-md">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-500" />
              <span className="text-xs font-medium text-yellow-900">6mo</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-md">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-red-500 border border-red-600" />
              <span className="text-xs font-medium text-red-900">3mo</span>
            </div>
          </div>
        </div>

      {/* Search and Sort*/}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Sort By:</label>
            <select
              id="sortBy"
              value={sortBy === 'Stock' ? (sortOrder === 'asc' ? 'stock-asc' : 'stock-desc') : 
                     sortBy === 'ExpiryDate' ? (sortOrder === 'asc' ? 'date-asc' : 'date-desc') : 
                     'none'}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
            <option value="none">Name (A-Z)</option>
            <option value="stock-asc">Quantity (Low to High)</option>
            <option value="stock-desc">Quantity (High to Low)</option>
            <option value="date-asc">Expiry Date (Oldest First)</option>
            <option value="date-desc">Expiry Date (Newest First)</option>
            </select>
          </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  disabled={loading}
                />
              </div>
            </div>
        </div>
             {/* Generate Report Button */}
             <div className="flex justify-end gap-2"> 
              <button
                className="bg-blue-900 text-white px-6 py-2 rounded-md hover:bg-blue-500 transition-colors flex items-center gap-2"
                onClick={handleGenerateReport}
              >
                Generate Report 
              </button>
            </div>
          
        </div>
      </div>
      
      {/* Product List Table */}
      <div className="bg-white shadow overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="px-4 py-4 text-center font-semibold border-r border-white">PRODUCT</th>
              <th className="px-4 py-4 text-center font-semibold border-r border-white">CATEGORY</th>
              <th className="px-4 py-4 text-center font-semibold border-r border-white">BRAND</th>
              <th className="px-4 py-4 text-center font-semibold border-r border-white">PRICE</th>
              <th className="px-4 py-4 text-center font-semibold border-r border-white">QUANTITY</th>
              <th className="px-2 py-4 text-center font-semibold border-r border-white">LAST PURCHASE DATE</th>
              <th className="px-2 py-4 text-center font-semibold border-r border-white">EXPIRY</th>
              <th className="px-2 py-4 text-center font-semibold">ACTION</th>
            </tr>
          </thead>
          <tbody className=" bg-blue-50">
          {/* Check if products exist */}
          {loading && productList.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-gray-600 font-medium">Loading products...</p>
                </div>
              </td>
            </tr>
          ) : groupedEntries.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                No products found.
              </td>
            </tr>
          ) : (
            groupedEntries.flatMap(([productId, items]) => {
            const [primary, ...rest] = items;
            const isOpen = openGroups[productId] ?? false;
    
            return [
            <tr 
              key={primary.ProductItemID}
              onMouseEnter={() => rest.length > 0 && setOpenGroups(prev => ({ ...prev, [productId]: true }))}
              onMouseLeave={() => rest.length > 0 && setOpenGroups(prev => ({ ...prev, [productId]: false }))}
              className={rest.length > 0 ? 'cursor-pointer hover:bg-blue-100' : ''}
            >
              <td className="px-4 py-4 text-gray-700 text-left border border-white">
                <div className="flex items-center gap-3">
                        {primary.Product.Image ? (
                          <img
                            src={primary.Product.Image}
                            alt={primary.Product.Name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-200 rounded flex items-center justify-center">
                            <span className="text-blue-600 text-sm">
                              {primary.Product.Name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium">
                        {primary.Product.Name}
                        </span>
                </div>
              </td>
              <td className="px-2 py-4 text-gray-700 text-center border border-white">{primary.Product.Category}</td>
              <td className="px-4 py-4 text-gray-700 text-center border border-white">{primary.Product.Brand}</td>
              <td className="px-4 py-4 text-gray-700 text-center border border-white">₱{primary.Product.SellingPrice.toFixed(2)}</td>
              <td className="px-4 py-4 text-gray-700 text-center border border-white">{primary.Stock}</td>
              <td className="px-4 py-4 text-gray-700 text-center border border-white">
              {primary.LastPurchaseDate
                ? new Date(primary.LastPurchaseDate).toLocaleDateString()
                : "N/A"}
              </td>
              <td className="px-4 py-4 text-gray-700 text-center border border-white">
                <span className={`px-2 py-1 rounded-full font-medium ${getExpiryColor(primary.ExpiryDate)}`}>
                {new Date(primary.ExpiryDate).toLocaleDateString('en-US')}
                </span>
              </td>              
              <td className="px-2 py-4 text-center border border-white">
                <div className="flex gap-2 justify-center">
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                    onClick={() => handleView(primary.ProductItemID)}
                    title="View Product Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                    onClick={() => navigate(`/products/edit/${primary.ProductItemID}`)}
                    title="Edit Product Item"
                  >
                    <PenSquare className="w-4 h-4" />
                  </button>
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                    onClick={() => {
                      setDeleteItem(primary);
                      const modal = document.getElementById('delete_modal') as HTMLDialogElement;
                      modal?.showModal();
                    }}
                    title="Upload Product Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>,
            ...(isOpen ? rest.map(item => (
            <tr 
              key={item.ProductItemID} 
              className="bg-white cursor-pointer hover:bg-gray-50"
              onMouseEnter={() => setOpenGroups(prev => ({ ...prev, [productId]: true }))}
              onMouseLeave={() => setOpenGroups(prev => ({ ...prev, [productId]: false }))}
            >
              <td className="px-4 py-4 text-gray-700 text-center">
                <div className="flex items-center gap-3">
                        {item.Product.Image ? (
                          <img
                            src={item.Product.Image}
                            alt={item.Product.Name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-200 rounded flex items-center justify-center">
                            <span className="text-blue-600 text-sm">
                              {item.Product.Name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="font-medium">
                        {item.Product.Name}
                      </span>
                </div>
              </td>
              <td className="px-2 py-4 text-gray-700 text-center">{item.Product.Category}</td>
              <td className="px-4 py-4 text-gray-700 text-center">{item.Product.Brand}</td>
              <td className="px-4 py-4 text-gray-700 text-center">₱{item.Product.SellingPrice.toFixed(2)}</td>
              <td className="px-4 py-4 text-gray-700 text-center">{item.Stock}</td>
              <td className="px-4 py-4 text-gray-700 text-center border border-white">
              {item.LastPurchaseDate
                ? new Date(item.LastPurchaseDate).toLocaleDateString()
                : "N/A"}
              </td>
              <td className="px-4 py-4 text-gray-700 text-center">
                <span className={`px-2 py-1 rounded-full font-medium ${getExpiryColor(item.ExpiryDate)}`}>
                {new Date(item.ExpiryDate).toLocaleDateString('en-US')}
                </span>
              </td>
              <td className="px-2 py-4 text-center">
                <div className="flex gap-2 justify-center">
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                    onClick={() => handleView(item.ProductItemID)}
                    title="View Product Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                    onClick={() => navigate(`/products/edit/${item.ProductItemID}`)}
                    title="Edit Product Item"
                  >
                    <PenSquare className="w-4 h-4" />
                  </button>
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                    onClick={() => {
                      setDeleteItem(item);
                      const modal = document.getElementById('delete_modal') as HTMLDialogElement;
                      modal?.showModal();
                    }}
                    title="Upload Product Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            )) : [])
            ]
            }
            ))
          }
          </tbody>
        </table>
      </div>
      </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {groupedEntries.length} of {Object.keys(groupedProducts).length} products
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (currentPage === 1) {
                // On first group page - fetch previous item page if available
                if (pagination && pagination.page > 1) {
                  setItemPage(pagination.page - 1);
                }
              } else {
                // Just go to previous group page (no API call needed)
                setCurrentPage((prev) => prev - 1);
              }
            }}
            disabled={(currentPage === 1 && (!pagination || pagination.page === 1)) || loading}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go to previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button 
            onClick={() => {
              if (currentPage === totalPages) {
                // On last group page - fetch next item page if available
                if (pagination && pagination.page < pagination.totalPages) {
                  setItemPage(pagination.page + 1);
                }
              } else {
                // Just go to next group page (no API call needed)
                setCurrentPage((prev) => prev + 1);
              }
            }}
            disabled={(currentPage === totalPages && (!pagination || pagination.page >= pagination.totalPages)) || loading}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go to next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Details Modal */}
      <dialog id="product_modal" className="modal">
        <div className="modal-box bg-white rounded-lg w-full max-w-3xl max-h-[90vh] p-0 text-black flex flex-col">
          {errorMessage ? (
            <div className="p-6">
              <div className="text-red-500 font-semibold">
                {errorMessage}
              </div>
              <div className="mt-6 flex justify-end">
                <form method="dialog">
                  <button className="text-gray-500 hover:text-gray-700">
                    <X className="w-8 h-8" />
                  </button>
                </form>
              </div>
            </div>
          ) : selectedProductItem ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
                <form method="dialog">
                  <button                     
                    className="bg-transparent border-none cursor-pointer rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                  >
                    <X className="w-8 h-8" />
                  </button>
                </form>
              </div>

              <div className="mb-20 flex gap-6 items-start">
                <div className="flex-shrink-0 pl-10">
                  {selectedProductItem.Product.Image ? (
                  <img
                    src={selectedProductItem.Product.Image}
                    alt={selectedProductItem.Product.Name}
                    className="w-80 h-80"
                  />
                  ) : (
                  <div className="w-48 h-48 bg-blue-200 rounded-lg flex items-center justify-center border border-gray-300">
                    <span className="text-blue-600 text-3xl font-bold">
                      {selectedProductItem.Product.Name.charAt(0)}
                    </span>
                  </div>
                  )}
                </div>

                <div className="flex-grow space-y-2 text-sm text-gray-700 pl-8">
                  <p className="text-5xl font-bold">{selectedProductItem.Product.Name}</p>
                  <hr className="border-t-2 border-gray-400 mr-12"/>
                  <p className="text-xl font-normal">Brand: {selectedProductItem.Product.Brand}</p>
                  <p className="text-xl font-normal">Category: {selectedProductItem.Product.Category}</p>
                  <p className="text-xl font-normal">Price: ₱{selectedProductItem.Product.SellingPrice.toFixed(2)}</p>
                  <p className="text-xl font-normal">Expiry Date: 
                    {new Date(selectedProductItem.ExpiryDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-xl font-normal">{selectedProductItem.Product.IsVATExemptYN? "VAT Exempt" : "Vatable (12% VAT)"}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6">
              <p className="text-sm text-gray-500">No product selected.</p>
              <div className="mt-6 flex justify-end">
                <form method="dialog">
                  <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors">
                    Close
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </dialog>

      {/*Delete Product Modal */}
      <dialog id="delete_modal" className="modal">
        <div className="modal-box bg-white rounded-lg w-full max-w-md p-6 text-black">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Confirmation</h3>
          <p className="text-sm text-gray-700 mb-6">
            ARE YOU SURE YOU WANT TO DELETE THIS ITEM?
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={handleDeleteConfirmed}
              className="px-4 py-2 bg-blue-800 text-white border-blue-800 rounded-md"
            >
              Yes
            </button>
            <form method="dialog">
              <button className="px-4 py-2 bg-white text-blue-800 border-blue-800 rounded-md">
                No
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Report Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-[95vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Product List Report Preview
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewData.filename} ({previewData.rows.length} rows)
                </p>
              </div>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 min-h-0">
              {previewData.rows.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">No data to preview</div>
                </div>
              ) : (
                <div className="preview-scroll-container overflow-x-auto overflow-y-auto h-full">
                  <table className="table table-zebra w-full text-sm min-w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {Object.keys(previewData.rows[0] || {}).map((header) => (
                          <th key={header} className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {Object.keys(previewData.rows[0] || {}).map((header) => (
                            <td key={header} className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">
                              {row[header] !== null && row[header] !== undefined
                                ? String(row[header])
                                : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.rows.length > 50 && (
                    <div className="mt-4 text-center text-sm text-gray-500">
                      Showing first 50 of {previewData.rows.length} rows. Full data will be included in download.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closePreview}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                onClick={confirmDownloadReport}
                disabled={!previewData || previewData.rows.length === 0}
              >
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};