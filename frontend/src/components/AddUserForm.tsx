import { useState } from 'react'
import { X } from 'lucide-react'

interface AddUserFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userData: any) => void
}

interface UserFormData {
  firstName: string
  middleInitial: string
  lastName: string
  username: string
  password: string
  email: string
  contactNumber: string
  address: string
  role: string
}

const AddUserForm = ({ isOpen, onClose, onSubmit }: AddUserFormProps) => {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    middleInitial: '',
    lastName: '',
    username: '',
    password: '',
    email: '',
    contactNumber: '',
    address: '',
    role: ''
  })

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    // Reset form
    setFormData({
      firstName: '',
      middleInitial: '',
      lastName: '',
      username: '',
      password: '',
      email: '',
      contactNumber: '',
      address: '',
      role: ''
    })
    onClose()
  }

  const handleCancel = () => {
    setFormData({
      firstName: '',
      middleInitial: '',
      lastName: '',
      username: '',
      password: '',
      email: '',
      contactNumber: '',
      address: '',
      role: ''
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">ADD USER</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="border-2 border-blue-200 rounded-lg p-6 space-y-6">
            
            {/* Name Fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">NAME:</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder=""
                  />
                  <label className="block text-xs text-gray-500 mt-1">FIRST</label>
                </div>
                <div className="w-20">
                  <input
                    type="text"
                    value={formData.middleInitial}
                    onChange={(e) => handleInputChange('middleInitial', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder=""
                    maxLength={1}
                  />
                  <label className="block text-xs text-gray-500 mt-1">M.I.</label>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder=""
                  />
                  <label className="block text-xs text-gray-500 mt-1">LAST</label>
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">USERNAME:</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">PASSWORD:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">EMAIL:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">CONTACT NUMBER:</label>
              <input
                type="tel"
                value={formData.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ADDRESS:</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ROLE:</label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">--SELECT--</option>
                <option value="PHARMACIST">PHARMACIST</option>
                <option value="CLERK">CLERK</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              CONFIRM
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddUserForm
