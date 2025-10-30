import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supplierService, CreateSupplier } from '../services/supplierService'
import loadingService from '../services/loadingService'

interface SupplierFormData {
  name: string
  contactPerson: string
  contactNumber: string
  email: string
  address: string
  remarks: string
  status: string
}

const AddSupplier = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    address: '',
    remarks: '',
    status: '--SELECT--'
  })

  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate status selection
    if (formData.status === '--SELECT--') {
      loadingService.error('add-supplier', 'Please select a status')
      return
    }
    
    loadingService.start('add-supplier', 'Adding supplier...')
    
    try {
      const createSupplierData: CreateSupplier = {
        Name: formData.name,
        ContactPerson: formData.contactPerson,
        ContactNumber: formData.contactNumber,
        Email: formData.email,
        Address: formData.address,
        Remarks: formData.remarks,
        IsActiveYN: formData.status === 'ACTIVE',
      }

      const response = await supplierService.createSupplier(createSupplierData)
      
      if (response.success) {
        loadingService.success('add-supplier', `Supplier "${formData.name}" added successfully!`)
        navigate('/suppliers')
      } else {
        loadingService.error('add-supplier', 'Failed to create supplier: ' + response.message)
      }
    } catch (error) {
      loadingService.error('add-supplier', 'Error creating supplier: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCancel = () => {
    navigate('/suppliers')
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Suppliers</span>
        </button>
        <h1 className="text-3xl font-bold text-blue-900">ADD SUPPLIER</h1>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow p-8">
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

export default AddSupplier

