import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import alertService from '../services/alertService'

interface SupplierFormData {
  name: string
  contactPerson: string
  contactNumber: string
  email: string
  address: string
  remarks: string
  status: string
}

interface EditSupplierFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (supplierData: any) => void
  supplier?: {
    SupplierID: string
    Name: string
    ContactPerson?: string
    ContactNumber?: string
    Email?: string
    Address?: string
    Remarks?: string
    IsActiveYN?: boolean
  } | null
}

const EditSupplierForm = ({ isOpen, onClose, onSubmit, supplier }: EditSupplierFormProps) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    address: '',
    remarks: '',
    status: '--SELECT--'
  })

  // Pre-fill form data when supplier prop changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.Name || '',
        contactPerson: supplier.ContactPerson || '',
        contactNumber: supplier.ContactNumber || '',
        email: supplier.Email || '',
        address: supplier.Address || '',
        remarks: supplier.Remarks || '',
        status: supplier.IsActiveYN ? 'ACTIVE' : 'INACTIVE'
      })
    }
  }, [supplier])

  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!supplier) {
      alertService.error('No supplier selected for editing')
      return
    }
    
    // Validate status selection
    if (formData.status === '--SELECT--') {
      alertService.warning('Please select a status')
      return
    }
    
    // Convert form data to the format expected by the backend
    const updatedSupplierData = {
      supplierId: supplier.SupplierID,
      name: formData.name,
      contactPerson: formData.contactPerson,
      contactNumber: formData.contactNumber,
      email: formData.email,
      address: formData.address,
      remarks: formData.remarks,
      isActiveYN: formData.status === 'ACTIVE'
    }
    
    onSubmit(updatedSupplierData)
    onClose()
  }

  const handleCancel = () => {
    // Reset form to original values
    if (supplier) {
      setFormData({
        name: supplier.Name || '',
        contactPerson: supplier.ContactPerson || '',
        contactNumber: supplier.ContactNumber || '',
        email: supplier.Email || '',
        address: supplier.Address || '',
        remarks: supplier.Remarks || '',
        status: supplier.IsActiveYN ? 'ACTIVE' : 'INACTIVE'
      })
    }
    onClose()
  }

  if (!isOpen || !supplier) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">EDIT SUPPLIER</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-blue-50 rounded-lg p-6 space-y-6">
            
            {/* Row 1: NAME and CONTACT PERSON */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">NAME:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CONTACT PERSON:</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 2: CONTACT NUMBER and EMAIL ADDRESS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CONTACT NUMBER:</label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">EMAIL ADDRESS:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 3: STATUS and ADDRESS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">STATUS:</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="--SELECT--">--SELECT--</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">ADDRESS:</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 4: REMARKS (full width) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">REMARKS:</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter any additional remarks or notes..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={handleCancel}
              className="px-8 py-3 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              CONFIRM
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditSupplierForm
