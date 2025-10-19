import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supplierService, SupplierResponse } from '../services/supplierService'

interface SupplierDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  supplierId: string | null
}

const SupplierDetailsModal = ({ isOpen, onClose, supplierId }: SupplierDetailsModalProps) => {
  const [supplier, setSupplier] = useState<SupplierResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch supplier details when modal opens
  useEffect(() => {
    if (isOpen && supplierId) {
      fetchSupplierDetails()
    }
  }, [isOpen, supplierId])

  const fetchSupplierDetails = async () => {
    if (!supplierId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await supplierService.getSupplierById(supplierId)
      
      if (response.success && response.data) {
        setSupplier(response.data)
      } else {
        setError(response.message || 'Failed to fetch supplier details')
      }
    } catch (err) {
      console.error('Error fetching supplier details:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier details')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSupplier(null)
    setError(null)
    onClose()
  }

  // Format supplier ID to show a shortened version of the UUID
  const formatSupplierId = (supplierId: string) => {
    if (!supplierId) return 'N/A'
    // Take the first 8 characters of the UUID and format as S-XXXX
    const shortId = supplierId.substring(0, 8).toUpperCase()
    return `S-${shortId}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">
            SUPPLIER ID: {supplier ? formatSupplierId(supplier.SupplierID!) : 'Loading...'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading supplier details...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <button
              onClick={fetchSupplierDetails}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : supplier ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">NAME:</label>
                <div className="text-gray-900 capitalize">{supplier.Name}</div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CONTACT NUMBER:</label>
                <div className="text-gray-900">{supplier.ContactNumber || 'N/A'}</div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">STATUS:</label>
                <div className="text-gray-900">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    supplier.IsActiveYN
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {supplier.IsActiveYN ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">REMARKS:</label>
                <div className="text-gray-900">{supplier.Remarks || 'N/A'}</div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CONTACT PERSON:</label>
                <div className="text-gray-900 capitalize">{supplier.ContactPerson || 'N/A'}</div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">EMAIL ADDRESS:</label>
                <div className="text-gray-900">{supplier.Email || 'N/A'}</div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">ADDRESS:</label>
                <div className="text-gray-900">{supplier.Address || 'N/A'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No supplier data available
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

export default SupplierDetailsModal
