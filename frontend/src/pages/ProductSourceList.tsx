import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import alertService from '../services/alertService'
import { productService, ProductSourceItem, ProductSourceListParams } from '../services/productService'

const ProductSourceList = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'ProductName' | 'SupplierName' | 'LastPurchaseDate' | 'none'>('none')
  const [products, setProducts] = useState<ProductSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  // Fetch products from API
  const fetchProducts = useCallback(async (page = 1, search = searchTerm, sort = sortBy) => {
    try {
      setLoading(true)
      setError(null)
      
      const params: ProductSourceListParams = {
        page,
        limit: 10, // Display 10 items per page
        search: search || undefined,
        sortBy: sort !== 'none' ? sort : undefined
      }
      
      const response = await productService.getProductSourceList(params)
      
      setProducts(response.products)
      setCurrentPage(response.page)
      setTotalPages(response.totalPages)
      setTotalProducts(response.total)
    } catch (err) {
      console.error('Error fetching products:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products'
      setError(errorMessage)
      alertService.error(errorMessage)
      if (!products.length) {
        setProducts([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load products on component mount
  useEffect(() => {
    fetchProducts()
  }, [])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts(1, searchTerm, sortBy)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, sortBy])

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as 'ProductName' | 'SupplierName' | 'LastPurchaseDate' | 'none'
    setSortBy(newSort)
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    })
  }

  // Format product ID to a shorter display format
  const formatProductId = (index: number) => {
    return String(index + 1).padStart(2, '0')
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">PRODUCT SOURCE LIST</h1>

        {/* Sort and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort By</label>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
              >
                <option value="none">None</option>
                <option value="ProductName">Product Name</option>
                <option value="SupplierName">Supplier Name</option>
                <option value="LastPurchaseDate">Last Purchase Date</option>
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">PRODUCT ID</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">PRODUCT</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">SUPPLIER NAME</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">CONTACT NUMBER</th>
                <th className="px-6 py-4 text-center font-semibold">LAST PURCHASE DATE</th>
              </tr>
            </thead>
            <tbody className=" bg-blue-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-red-500">
                    Error: {error}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr
                    key={product.ProductID}
                  >
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                    {product.ProductID}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      <div className="flex items-center gap-3">
                        {product.ProductImage ? (
                          <img
                            src={product.ProductImage}
                            alt={product.ProductName}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-200 rounded flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">
                              {product.ProductName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-gray-700 font-medium">
                          {product.ProductName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {product.SupplierName}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {product.ContactNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {formatDate(product.LastPurchaseDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {products.length} of {totalProducts} products
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchProducts(currentPage - 1, searchTerm, sortBy)}
            disabled={currentPage <= 1}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => fetchProducts(currentPage + 1, searchTerm, sortBy)}
            disabled={currentPage >= totalPages}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductSourceList