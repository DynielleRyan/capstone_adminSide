import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProductItemByID } from '../../services/productListService';
import { productItemService } from '../../services/productItemService';
import { ProductItem } from '../../types/productItem';
import api from '../../services/api';
import alertService from '../../services/alertService';

export const EditProductList = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productItem, setProductItem] = useState<ProductItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: '',
    price: '',
    Stock: 0,
    ExpiryDate: '',
  });

  useEffect(() => {
    if (id) {
      loadProductItem();
    }
  }, [id]);

  const loadProductItem = async () => {
    try {
      setLoading(true);
      const data = await fetchProductItemByID(id!);
      setProductItem(data);
      
      // Populate form with existing data
      setFormData({
        name: data.Product.Name,
        genericName: data.Product.GenericName,
        brand: data.Product.Brand,
        category: data.Product.Category,
        price: data.Product.SellingPrice.toString(),
        Stock: data.Stock,
        ExpiryDate: data.ExpiryDate ? new Date(data.ExpiryDate).toISOString().split('T')[0] : '',
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;

    try {
      // Validate all required fields
      if (!formData.name || !formData.genericName || !formData.brand || !formData.category || !formData.price) {
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

      setSaving(true);

      // Prepare update data for product item
      const updateData = {
        Stock: formData.Stock,
        ExpiryDate: formData.ExpiryDate,
      };

      // Update product item
      await productItemService.updateProductItem(id, updateData);
      
      // Update product details (name, price, etc.)
      if (productItem) {
        const productUpdateData = {
          Name: formData.name,
          GenericName: formData.genericName,
          Brand: formData.brand,
          Category: formData.category,
          SellingPrice: parseFloat(formData.price),
        };
        
        await api.put(`/products/${productItem.ProductID}`, productUpdateData);
      }
      
      alertService.success('Product updated successfully!');
      
      // Navigate back after 1.5 seconds
      setTimeout(() => {
        navigate('/products/list');
      }, 1500);
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
              <div className="block w-full h-64 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                {productItem.Product.Image ? (
                  <img
                    src={productItem.Product.Image}
                    alt={productItem.Product.Name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-4xl font-bold text-blue-600">
                      {productItem.Product.Name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
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
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
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

