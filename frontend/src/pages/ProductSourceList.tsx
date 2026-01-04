import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import alertService from '../services/alertService'
import { productService, ProductSourceItem, ProductSourceListParams } from '../services/productService'
import { supplierService, SupplierResponse } from '../services/supplierService'
import { fetchPurchaseOrders } from '../services/purchaseOrderService'
import { toast } from 'react-toastify'

const ProductSourceList = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'ProductName' | 'SupplierName' | 'LastPurchaseDate' | 'none'>('none')
  const [products, setProducts] = useState<ProductSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewData, setPreviewData] = useState<{
    rows: any[]
    filename: string
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const hasMountedRef = useRef(false)

  // Fetch products from API
  const fetchProducts = useCallback(
    async (page = 1, search?: string, sort?: 'ProductName' | 'SupplierName' | 'LastPurchaseDate' | 'none') => {
      try {
        setLoading(true)
        setError(null)
        
        const params: ProductSourceListParams = {
          page,
          limit: 10,
          search: search || undefined,
          sortBy: sort && sort !== 'none' ? sort : undefined
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
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Load products on component mount
  useEffect(() => {
    fetchProducts()
    hasMountedRef.current = true
  }, [fetchProducts])

  // Debounced search effect - refetch from page 1 when search or sort changes
  useEffect(() => {
    // Skip on first render since we already fetch on mount
    if (!hasMountedRef.current) return

    const timeoutId = setTimeout(() => {
      fetchProducts(1, searchTerm || undefined, sortBy)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, sortBy, fetchProducts])

  // Load suppliers on mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await supplierService.getSuppliers({ limit: 1000, isActive: true })
        if (response.success && response.data) {
          setSuppliers(response.data.suppliers)
        }
      } catch (err) {
        console.error('Error fetching suppliers:', err)
      }
    }
    loadSuppliers()
  }, [])

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

  // Open supplier selection modal
  const handleGenerateReport = () => {
    setSupplierModalOpen(true)
  }

  // Close supplier selection modal
  const closeSupplierModal = () => {
    setSupplierModalOpen(false)
    setSelectedSuppliers(new Set())
  }

  // Toggle supplier selection
  const toggleSupplier = (supplierID: string) => {
    setSelectedSuppliers(prev => {
      const next = new Set(prev)
      if (next.has(supplierID)) {
        next.delete(supplierID)
      } else {
        next.add(supplierID)
      }
      return next
    })
  }

  // Generate preview from selected suppliers
  const generatePreview = async () => {
    if (selectedSuppliers.size === 0) {
      toast.warning('Please select at least one supplier')
      return
    }

    setLoadingPreview(true)
    setSupplierModalOpen(false)

    try {
      // Fetch all purchase orders
      const allPurchaseOrders = await fetchPurchaseOrders()
      
      // Filter by selected suppliers
      const filteredOrders = allPurchaseOrders.filter(po => 
        selectedSuppliers.has(po.SupplierID)
      )

      if (filteredOrders.length === 0) {
        toast.warning('No purchase orders found for selected suppliers')
        setLoadingPreview(false)
        return
      }

      // Format data for preview and CSV
      const rows = filteredOrders.map(po => ({
        'Purchase Order ID': po.PurchaseOrderID,
        'Supplier Name': po.Supplier?.Name || 'N/A',
        'Product Name': po.Product?.Name || 'N/A',
        'Quantity': po.Quantity,
        'Base Price': `₱${Number(po.BasePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        'Total Purchase Cost': `₱${Number(po.TotalPurchaseCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        'Order Placed Date': po.OrderPlacedDateTime ? new Date(po.OrderPlacedDateTime).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }) : 'N/A',
        'Order Arrival Date': po.OrderArrivalDateTime ? new Date(po.OrderArrivalDateTime).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }) : 'Pending',
        'ETA': po.ETA ? new Date(po.ETA).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }) : 'N/A',
      }))

      const filename = `supplier_purchase_report_${new Date().toISOString().split('T')[0]}.csv`

      setPreviewData({ rows, filename })
      setPreviewModalOpen(true)
    } catch (err) {
      console.error('Error generating preview:', err)
      toast.error('Failed to generate report preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  // Download CSV
  const downloadCSV = (filename: string, rows: any[]) => {
    if (rows.length === 0) {
      toast.warning('No data to download')
      return
    }

    const headers = Object.keys(rows[0])
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header] || ''
          // Escape commas and quotes in values
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`Report downloaded successfully!`)
  }

  // Confirm and download CSV
  const confirmDownloadReport = () => {
    if (!previewData) return
    downloadCSV(previewData.filename, previewData.rows)
    setPreviewModalOpen(false)
    setPreviewData(null)
    setSelectedSuppliers(new Set())
  }

  // Close preview modal
  const closePreview = () => {
    setPreviewModalOpen(false)
    setPreviewData(null)
    setSelectedSuppliers(new Set())
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
                disabled={loading}
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
          <button
            onClick={handleGenerateReport}
            className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">PRODUCT</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">SUPPLIER NAME</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">CONTACT NUMBER</th>
                <th className="px-6 py-4 text-center font-semibold">LAST PURCHASE DATE</th>
              </tr>
            </thead>
            <tbody className=" bg-blue-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-red-500">
                    Error: {error}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.ProductID}
                  >
                    <td className="px-6 py-3 text-gray-700 border border-white">
                      <div className="flex items-center justify-center gap-2">
                        {product.ProductImage ? (
                          <img
                            src={product.ProductImage}
                            alt={product.ProductName}
                            className="w-10 h-10 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-200 rounded flex items-center justify-center flex-shrink-0">
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
                    <td className="px-6 py-3 text-gray-700 text-center border border-white">
                      {product.SupplierName}
                    </td>
                    <td className="px-6 py-3 text-gray-700 text-center border border-white">
                      {product.ContactNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-gray-700 text-center border border-white">
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
            onClick={() => fetchProducts(currentPage - 1, searchTerm || undefined, sortBy)}
            disabled={currentPage <= 1 || loading}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => fetchProducts(currentPage + 1, searchTerm || undefined, sortBy)}
            disabled={currentPage >= totalPages || loading}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Supplier Selection Modal */}
      {supplierModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Suppliers for Report
              </h3>
              <button
                onClick={closeSupplierModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 min-h-0">
              {suppliers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No suppliers available
                </div>
              ) : (
                <div className="space-y-2">
                  {suppliers.map((supplier) => (
                    <label
                      key={supplier.SupplierID}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.has(supplier.SupplierID || '')}
                        onChange={() => toggleSupplier(supplier.SupplierID || '')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">
                          {supplier.Name}
                        </div>
                        {supplier.ContactNumber && (
                          <div className="text-sm text-gray-500">
                            {supplier.ContactNumber}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closeSupplierModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={generatePreview}
                disabled={selectedSuppliers.size === 0 || loadingPreview}
              >
                {loadingPreview ? 'Generating...' : 'Generate Preview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-[95vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Report Preview
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewData.filename} ({previewData.rows.length} rows)
                </p>
              </div>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
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
                        {Object.keys(previewData.rows[0]).map((header) => (
                          <th 
                            key={header} 
                            className={`px-4 py-2 font-semibold text-gray-700 whitespace-nowrap ${
                              header === "Product Name" || header === "Supplier Name" ? "text-left" : "text-center"
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {Object.keys(previewData.rows[0]).map((header) => (
                            <td 
                              key={header} 
                              className={`px-4 py-2 border-b border-gray-200 whitespace-nowrap ${
                                header === "Product Name" || header === "Supplier Name" ? "text-left" : "text-center"
                              }`}
                            >
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
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={confirmDownloadReport}
                disabled={!previewData || previewData.rows.length === 0}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductSourceList