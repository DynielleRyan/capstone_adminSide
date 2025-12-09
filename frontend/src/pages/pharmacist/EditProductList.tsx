import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProductItemByID } from '../../services/productListService';
import { productItemService } from '../../services/productItemService';
import { ProductItem } from '../../types/productItem';
import api from '../../services/api';
import alertService from '../../services/alertService';
import { supplierService, SupplierResponse } from '../../services/supplierService';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const EditProductList = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productItem, setProductItem] = useState<ProductItem | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: '',
    price: '',
    Stock: 0,
    ExpiryDate: '',
    supplierId: '',
    seniorPWD: false,
    vatExempted: false,
  });

  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (id) {
      loadProductItem();
    }
  }, [id]);

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const response = await supplierService.getSuppliers({ limit: 1000, isActive: true });
      if (response.success && response.data) {
        setSuppliers(response.data.suppliers);
      }
    } catch (err: any) {
      console.error('Error loading suppliers:', err);
      alertService.error('Failed to load suppliers');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadProductItem = async () => {
    try {
      setLoading(true);
      const data = await fetchProductItemByID(id!);
      setProductItem(data);
      
      // Fetch full product data to get SupplierID
      const productResponse = await api.get(`/products/${data.ProductID}`);
      const fullProduct = productResponse.data.data;
      
      // Populate form with existing data
      setFormData({
        name: data.Product.Name,
        genericName: data.Product.GenericName,
        brand: data.Product.Brand,
        category: data.Product.Category,
        price: data.Product.SellingPrice.toString(),
        Stock: data.Stock,
        ExpiryDate: data.ExpiryDate ? new Date(data.ExpiryDate).toISOString().split('T')[0] : '',
        supplierId: fullProduct.SupplierID || '',
        seniorPWD: fullProduct.SeniorPWDYN || false,
        vatExempted: fullProduct.IsVATExemptYN || false,
      });
      
      // Set initial image preview
      setImagePreview(data.Product.Image || '');
    } catch (err: any) {
      alertService.error(err.message || 'Failed to load product item');
      navigate('/products/list');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'Stock') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alertService.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alertService.error('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;

    try {
      // Validate all required fields
      if (!formData.name || !formData.genericName || !formData.brand || !formData.category || !formData.price || !formData.supplierId) {
        alertService.error('Please fill in all required fields');
        return;
      }

      // Validate stock
      if (formData.Stock < 0) {
        alertService.error('Stock cannot be negative');
        return;
      }

      // Validate price
      if (parseFloat(formData.price) <= 0) {
        alertService.error('Price must be greater than 0');
        return;
      }

      // Validate expiry date
      if (!formData.ExpiryDate) {
        alertService.error('Expiry date is required');
        return;
      }

      // Validate category
      if (formData.category === '' || formData.category === '--Select--') {
        alertService.error('Please select a category');
        return;
      }

      // Validate supplier
      if (formData.supplierId === '' || formData.supplierId === '--Select--') {
        alertService.error('Please select a supplier');
        return;
      }

      setSaving(true);

      // Prepare update data for product item
      const updateData = {
        Stock: formData.Stock,
        ExpiryDate: formData.ExpiryDate,
      };

      // Update product item
      await productItemService.updateProductItem(id, updateData);
      
      // Calculate VAT amount (12% if not VAT exempted)
      const sellingPrice = parseFloat(formData.price);
      const vatAmount = formData.vatExempted ? 0 : sellingPrice * 0.12;

      // Update product details (name, price, supplier, etc.)
      if (productItem) {
        const productUpdateData: any = {
          Name: formData.name,
          GenericName: formData.genericName,
          Brand: formData.brand,
          Category: formData.category,
          SellingPrice: sellingPrice,
          SupplierID: formData.supplierId,
          SeniorPWDYN: formData.seniorPWD,
          IsVATExemptYN: formData.vatExempted,
          VATAmount: vatAmount,
        };
        
        // Add image if changed
        if (imageFile) {
          // Convert image to base64
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onloadend = () => {
              productUpdateData.Image = reader.result;
              resolve(null);
            };
            reader.readAsDataURL(imageFile);
          });
        }
        
        await api.put(`/products/${productItem.ProductID}`, productUpdateData);
      }
      
      alertService.success('Product updated successfully!');
      
      // Navigate back after showing the toast (2.5 seconds to see the toast)
      setTimeout(() => {
        navigate('/products/list');
      }, 2500);
    } catch (err: any) {
      alertService.error(err.message || 'Failed to update product');
      console.error('Error updating product:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!productItem) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold mb-4">Product item not found</p>
          <button
            onClick={() => navigate('/products/list')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Product List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <ToastContainer />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-900">Edit Product</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-blue-50 rounded-lg p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
          {/* Image Section */}
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
                className="block w-full h-64 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
              >
                {imagePreview ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={imagePreview}
                      alt={formData.name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                      <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to change image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Click to upload image</span>
                  </div>
                )}
              </label>
            </div>
            {imageFile && (
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(productItem?.Product.Image || '');
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Remove new image
              </button>
            )}
          </div>

          {/* Product Name */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Product Name: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
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
              name="genericName"
              value={formData.genericName}
              onChange={handleInputChange}
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
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
              name="Stock"
              min="0"
              value={formData.Stock}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Brand */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Brand <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleInputChange}
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
              name="ExpiryDate"
              value={formData.ExpiryDate}
              onChange={handleInputChange}
              min={new Date().toISOString().split("T")[0]}
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
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">--Select--</option>
              <option value="Prescription">Prescription</option>
              <option value="Over-the-Counter">Over-the-Counter</option>
              <option value="Vitamins">Vitamins</option>
              <option value="Supplements">Supplements</option>
              <option value="First Aid">First Aid</option>
              <option value="Personal Care">Personal Care</option>
              <option value="Medical Devices">Medical Devices</option>
              <option value="Foods">Foods</option>
            </select>
          </div>
        </div>

        {/* Supplier Row */}
        <div className="grid grid-cols-1 mb-6">
          {/* Supplier Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loadingSuppliers}
            >
              <option value="">--Select Supplier--</option>
              {suppliers.map((supplier) => (
                <option key={supplier.SupplierID} value={supplier.SupplierID}>
                  {supplier.Name}
                </option>
              ))}
            </select>
            {loadingSuppliers && (
              <p className="text-sm text-gray-500 mt-1">Loading suppliers...</p>
            )}
          </div>
        </div>

        {/* Checkboxes Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Senior/PWD Discount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Senior/PWD Discount Eligible
            </label>
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                name="seniorPWD"
                checked={formData.seniorPWD}
                onChange={(e) => setFormData(prev => ({ ...prev, seniorPWD: e.target.checked }))}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-3 text-sm text-gray-700">
                This product is eligible for Senior Citizen/PWD discount
              </label>
            </div>
          </div>

          {/* VAT Exemption */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              VAT Exemption
            </label>
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                name="vatExempted"
                checked={formData.vatExempted}
                onChange={(e) => setFormData(prev => ({ ...prev, vatExempted: e.target.checked }))}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-3 text-sm text-gray-700">
                This product is VAT exempt (if unchecked, 12% VAT will be applied)
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/products/list')}
            className="px-12 py-3 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            disabled={saving}
          >
            CANCEL
          </button>
          <button
            type="submit"
            className="px-12 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? "SAVING..." : "EDIT"}
          </button>
        </div>
      </form>
    </div>
  );
};

