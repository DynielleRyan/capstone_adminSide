import { useMemo, useState, useEffect } from 'react';
import { ProductItem } from '../types/productItem';
import { fetchProductItemByID, deleteProductItemByID } from '../services/productListService';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Eye, ChevronDown, PenSquare, Trash2, X  } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  productList: ProductItem[];
}

export const ProductListTable : React.FC<Props> = ({ productList }) => {
  const [selectedProductItem, setSelectedProductItem] = useState<ProductItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('none');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [DeleteItem, setDeleteItem] = useState<ProductItem | null>(null);
  
  // Delete product item from list
  const handleDeleteConfirmed = async () => {
    if (!DeleteItem) return;
    try {
      const message = await deleteProductItemByID(DeleteItem.ProductItemID);
      toast.success(message);
      setDeleteItem(null);
      const modal = document.getElementById('delete_modal') as HTMLDialogElement;
      modal?.close();
      // Optionally refresh product list here
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete product');
    }
  };
   
  // View product details
  const handleView = async (id: string) => {
    const result = await fetchProductItemByID(id);
    if (!result) {
      setErrorMessage('Transaction not found or failed to load.');
      setSelectedProductItem(null);
    } else {
      setSelectedProductItem(result);
      setErrorMessage(null);
    };
    
    

    const modal = document.getElementById('transaction_modal') as HTMLDialogElement;
    modal?.showModal();
  };

  const toggleGroup = (productId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  // Search products
  function filterProductList(productList: ProductItem[], searchTerm: string): ProductItem[] {
    const term = searchTerm.toLowerCase();

    return productList.filter((pl) => {
      const prodID = String(pl.ProductItemID).toLowerCase();
      const category = String(pl.Product.Category).toLowerCase();
      const brand = String(pl.Product.Brand).toLowerCase();
      const name = String(pl.Product.Name).toLowerCase();
      const genericName = String(pl.Product.GenericName).toLowerCase();
      const expiry = new Date(pl.ExpiryDate).toLocaleDateString().toLowerCase();

      return (
        prodID.includes(term) ||
        category.includes(term) ||
        brand.includes(term) ||
        name.includes(term) ||
        genericName.includes(term) ||
        expiry.includes(term)
      );
    });
  }

  // Sort products
  function sortProductList(productList: ProductItem[], sortBy: string): ProductItem[] {
    const sorted = [...productList];
  
    if (sortBy === 'none') {
      // Default alphabetical sort by product name
      sorted.sort((a, b) => a.Product.Name.localeCompare(b.Product.Name));
    } else if (sortBy === 'stock-asc') {
      sorted.sort((a, b) => a.Stock - b.Stock);
    } else if (sortBy === 'stock-desc') {
      sorted.sort((a, b) => b.Stock - a.Stock);
    } else if (sortBy === 'date-asc') {
      sorted.sort(
        (a, b) =>
          new Date(a.ExpiryDate).getTime() - new Date(b.ExpiryDate).getTime()
      );
    } else if (sortBy === 'date-desc') {
      sorted.sort(
        (a, b) =>
          new Date(b.ExpiryDate).getTime() - new Date(a.ExpiryDate).getTime()
      );
    }

    return sorted;
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
  
  // Prepare CSV headers for all Product List table columns
  const handleDownloadCSV = () => {
    const headers = [
      'ProductItemID', 
      'ProductID', 
      'Stock', 
      'ExpiryDate',
      'Name', 
      'Category', 
      'Brand', 
      'SellingPrice'
    ];
  
    // Prepare CSV data with all Product List table fields
    const rows = productList.map(item => {
      const row: Record<string, string | number | boolean> = {
        ProductItemID: item.ProductItemID,
        ProductID: item.ProductID,
        Stock: item.Stock,
        ExpiryDate: item.ExpiryDate,
        Name: item.Product.Name,
        Category: item.Product.Category,
        Brand: item.Product.Brand,
        SellingPrice: item.Product.SellingPrice,
      };
      return row;
    });
    
    
    // Combine headers and data
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');
  
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `product_list_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden"
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  

  // Combine search and sort in render logic
  const displayedProductList = useMemo(() => {
    const filtered = filterProductList(productList, searchTerm);
    return sortProductList(filtered, sortBy);
  }, [productList, searchTerm, sortBy]);


  // Group product items based on their ProductID
  const groupedProducts = useMemo(() => {
  // Product item will only be displayed if it satisfies the condition
  const validItems = displayedProductList.filter(
    item => item.IsActive === true && item.Stock > 0
  );

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
}, [displayedProductList]);

  const totalPages = Math.ceil(Object.keys(groupedProducts).length / itemsPerPage);

  // Count products for pagination per ProductID, not per product item
  const groupedEntries = useMemo(() => {
    const entries = Object.entries(groupedProducts); 
    const start = (currentPage - 1) * itemsPerPage;
    return entries.slice(start, start + itemsPerPage);
  }, [groupedProducts, currentPage]);

  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);


  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Legend */}
      <div className="px-6 py-4 mb-8 bg-blue-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-bold text-blue-900">
              LEGEND
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-block w-4 h-4 rounded bg-yellow-300" />
              <span className="text-blue-900 font-medium text-base">Yellow - 6 months</span>
              <span className="inline-block w-4 h-4 rounded bg-red-400 ml-2" />
              <span className="text-blue-900 font-semibold text-base">Red - 3 months</span>
            </div>
          </div>
      </div>

      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">Products</h1>

      {/* Search and Sort*/}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Sort By:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <option value="none">None</option>
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
                  placeholder="None"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
            </div>
        </div>
             {/* Download CSV Button */}
             <div className="flex justify-end gap-2"> 
              <button
                className="bg-blue-900 text-white px-6 py-2 rounded-md hover:bg-blue-500 transition-colors flex items-center gap-2"
                onClick={handleDownloadCSV}
              >
                DOWNLOAD CSV 
              </button>
            </div>
          
        </div>
      </div>
      
      {/* Product List Table */}
      <div className="bg-white shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="px-4 py-4 text-center font-semibold border-r border-white">ID</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">PRODUCT</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">CATEGORY</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">BRAND</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">PRICE</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">QUANTITY</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">EXPIRY</th>
              <th className="px-6 py-4 text-center font-semibold">ACTION</th>
            </tr>
          </thead>
          <tbody className=" bg-blue-50">
          {/* Check if products exist */}
          {groupedEntries.length === 0 ? (
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
            <tr key={primary.ProductItemID}>
              <td className="px-6 py-4 text-gray-700 border border-white">{primary.ProductID}</td>
              <td className=" w-[50px] px-6 py-4 text-gray-700 text-center border border-white">
                <div className="flex items-center gap-3 flex-shrink-0">
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
                        {rest.length > 0 && (
                        <button
                          onClick={() => toggleGroup(productId)}
                          className="text-blue-600 hover:text-blue-800 pl-2"
                          aria-label="Toggle group"
                        >
                          <ChevronDown className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        )}
                        </span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-700 text-center border border-white">{primary.Product.Category}</td>
              <td className="px-6 py-4 text-gray-700 text-center border border-white">{primary.Product.Brand}</td>
              <td className="px-6 py-4 text-gray-700 text-center border border-white">₱{primary.Product.SellingPrice.toFixed(2)}</td>
              <td className="px-6 py-4 text-gray-700 text-center border border-white">{primary.Stock}</td>
              <td className="px-6 py-4 text-gray-700 text-center border border-white">
                <span className={`px-3 py-1 rounded-full font-medium ${getExpiryColor(primary.ExpiryDate)}`}>
                {new Date(primary.ExpiryDate).toLocaleDateString('en-US')}
                </span>
              </td>              
              <td className="px-6 py-4 border border-white">
                <div className="flex gap-2">
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
            <tr key={item.ProductItemID} className="bg-white">
              <td className="px-6 py-4 text-gray-700 text-center"> </td>
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
              <td className="px-6 py-4 text-gray-700 text-center">{item.Product.Category}</td>
              <td className="px-6 py-4 text-gray-700 text-center">{item.Product.Brand}</td>
              <td className="px-6 py-4 text-gray-700 text-center">₱{item.Product.SellingPrice.toFixed(2)}</td>
              <td className="px-6 py-4 text-gray-700 text-center">{item.Stock}</td>
              <td className="px-6 py-4 text-gray-700 text-center">
                <span className={`px-3 py-1 rounded-full font-medium ${getExpiryColor(item.ExpiryDate)}`}>
                {new Date(item.ExpiryDate).toLocaleDateString('en-US')}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
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
            onClick={() => setCurrentPage((prev) => prev - 1)}
            disabled={currentPage === 1}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go to previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage === totalPages}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go to next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Details Modal */}
      <dialog id="transaction_modal" className="modal">
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
                  <p className="text-xl font-normal">{selectedProductItem.Product.IsVATExemptYN? "Vatable" : "NonVatable"}</p>
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

    </div>
  );
};
