import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import alertService from '../../services/alertService'
import { authService } from '../../services/authService'
import { productService, CreateProductData } from '../../services/productService'
import { productItemService } from '../../services/productItemService'
import api from '../../services/api'

interface ProductFormData {
  name: string
  genericName: string
  brand: string
  category: string
  price: string
  quantity: string
  expiry: string
  prescription: string
  vatExempted: string
  seniorPWD: string
  supplierID: string
  image: File | null
  imageBase64: string | null
}

const ProductUpload = () => {
  const [showForm, setShowForm] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Array<{ SupplierID: string; Name: string }>>([])
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    genericName: '',
    brand: '',
    category: '--Select--',
    price: '',
    quantity: '',
    expiry: '',
    prescription: '--Select--',
    vatExempted: '--Select--',
    seniorPWD: '--Select--',
    supplierID: '--Select--',
    image: null,
    imageBase64: null
  })

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await api.get('/suppliers?isActive=true&limit=100')
        if (response.data.success && response.data.data) {
          setSuppliers(response.data.data.suppliers)
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      }
    }
    fetchSuppliers()
  }, [])

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alertService.error('Please select a valid image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alertService.error('Image size should be less than 5MB')
        return
      }

      // Create preview and store base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImagePreview(base64String)
        setFormData(prev => ({ 
          ...prev, 
          image: file,
          imageBase64: base64String
        }))
      }
      reader.readAsDataURL(file)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.genericName || !formData.brand || !formData.price || !formData.quantity || !formData.expiry) {
      alertService.error('Please fill in all required fields')
      return
    }

    if (formData.category === '--Select--') {
      alertService.error('Please select a category')
      return
    }

    if (formData.prescription === '--Select--') {
      alertService.error('Please select prescription requirement')
      return
    }

    if (formData.vatExempted === '--Select--') {
      alertService.error('Please select VAT exemption status')
      return
    }

    if (formData.seniorPWD === '--Select--') {
      alertService.error('Please select Senior/PWD discount eligibility')
      return
    }

    if (formData.supplierID === '--Select--') {
      alertService.error('Please select a supplier')
      return
    }

    setIsSubmitting(true)

    try {
      // Get current user
      const currentUser = authService.getStoredUser()
      if (!currentUser || !currentUser.UserID) {
        alertService.error('User not authenticated')
        setIsSubmitting(false)
        return
      }

      // Upload image if provided
      let imageUrl = null
      if (formData.image && formData.imageBase64) {
        try {
          const uploadResponse = await productService.uploadImage(formData.image, formData.imageBase64)
          if (uploadResponse.success && uploadResponse.data) {
            imageUrl = uploadResponse.data.imageUrl
          } else {
            alertService.warning('Failed to upload image, product will be created without image')
          }
        } catch (error) {
          console.error('Error uploading image:', error)
          alertService.warning('Failed to upload image, product will be created without image')
        }
      }

      // Calculate VAT amount (12% if not VAT exempted)
      const sellingPrice = parseFloat(formData.price)
      const isVATExempt = formData.vatExempted === 'Yes'
      const vatAmount = isVATExempt ? 0 : sellingPrice * 0.12

      // Prepare product data
      const productData: CreateProductData = {
        UserID: currentUser.UserID,
        SupplierID: formData.supplierID,
        Name: formData.name,
        GenericName: formData.genericName,
        Category: formData.category,
        Brand: formData.brand,
        Image: imageUrl,
        SellingPrice: sellingPrice,
        IsVATExemptYN: isVATExempt,
        VATAmount: vatAmount,
        PrescriptionYN: formData.prescription === 'Yes',
        IsActive: true
      }

      // Create product using product service
      const response = await productService.createProduct(productData)

      if (response.success && response.data && response.data.ProductID) {
        // Create Product_Item for inventory tracking
        try {
          const productItemResponse = await productItemService.createProductItem({
            ProductID: response.data.ProductID,
            UserID: currentUser.UserID,
            Stock: parseInt(formData.quantity),
            ExpiryDate: formData.expiry,
            IsActive: true
          })

          if (productItemResponse.success) {
            alertService.success('Product and inventory added successfully!')
          } else {
            alertService.warning('Product created but inventory tracking failed')
          }
        } catch (inventoryError) {
          console.error('Error creating product inventory:', inventoryError)
          alertService.warning('Product created but inventory tracking failed')
        }
        
        // Reset form
        setFormData({
          name: '',
          genericName: '',
          brand: '',
          category: '--Select--',
          price: '',
          quantity: '',
          expiry: '',
          prescription: '--Select--',
          vatExempted: '--Select--',
          seniorPWD: '--Select--',
          supplierID: '--Select--',
          image: null,
          imageBase64: null
        })
        setImagePreview(null)
        setShowForm(false)
      } else {
        alertService.error(response.message || 'Failed to add product')
      }
    } catch (error: any) {
      console.error('Error creating product:', error)
      alertService.error(error.response?.data?.message || 'Failed to add product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSearch = () => {
    // Implement search functionality
    console.log('Searching for:', searchName)
    alertService.info('Search functionality coming soon!')
  }

  return (
    <div className="p-6 bg-white min-h-full">
        {!showForm ? (
          <>
            {/* Search Section */}
            <div className="mb-6">
              <div className="flex items-center gap-4 max-w-2xl">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    NAME
                  </label>
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search product..."
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="mt-7 px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  SEARCH
                </button>
              </div>
            </div>

            {/* Add New Item Box */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-24 flex flex-col items-center justify-center hover:border-blue-400 transition-colors">
              <button
                onClick={() => setShowForm(true)}
                className="flex flex-col items-center gap-4 text-gray-400 hover:text-blue-600 transition-colors group"
              >
                <Plus className="w-24 h-24 group-hover:scale-110 transition-transform" />
                <span className="text-xl font-medium">ADD NEW ITEM</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Add Product Form */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">ADD PRODUCT</h2>
            </div>

            <form onSubmit={handleSubmit} className="bg-blue-50 rounded-lg p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Image
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="block w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <Plus className="w-16 h-16 mb-2" />
                          <span className="text-sm">Click to upload</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Product Name */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Generic Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Generic Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => handleInputChange('genericName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price (₱) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Brand */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expiry}
                    onChange={(e) => handleInputChange('expiry', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="--Select--">--Select--</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Over-the-Counter">Over-the-Counter</option>
                    <option value="Vitamins">Vitamins</option>
                    <option value="Supplements">Supplements</option>
                    <option value="First Aid">First Aid</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Medical Devices">Medical Devices</option>
                  </select>
                </div>
              </div>

              {/* Dropdowns Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Supplier */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplierID}
                    onChange={(e) => handleInputChange('supplierID', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="--Select--">--Select--</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.SupplierID} value={supplier.SupplierID}>
                        {supplier.Name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prescription */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prescription <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.prescription}
                    onChange={(e) => handleInputChange('prescription', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="--Select--">--Select--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* VAT Exempted */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    VAT Exempted <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.vatExempted}
                    onChange={(e) => handleInputChange('vatExempted', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="--Select--">--Select--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Senior/PWD */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Senior/PWD <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.seniorPWD}
                    onChange={(e) => handleInputChange('seniorPWD', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="--Select--">--Select--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({
                      name: '',
                      genericName: '',
                      brand: '',
                      category: '--Select--',
                      price: '',
                      quantity: '',
                      expiry: '',
                      prescription: '--Select--',
                      vatExempted: '--Select--',
                      seniorPWD: '--Select--',
                      supplierID: '--Select--',
                      image: null,
                      imageBase64: null
                    })
                    setImagePreview(null)
                  }}
                  className="px-12 py-3 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                  disabled={isSubmitting}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-12 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'ADDING...' : 'ADD'}
                </button>
              </div>
            </form>
          </>
        )}
    </div>
  )
}

export default ProductUpload

