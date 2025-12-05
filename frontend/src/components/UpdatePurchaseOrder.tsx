import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchProducts } from '../services/purchaseOrderService';
import { fetchPurchaseOrderById, updatePurchaseOrder } from '../services/purchaseOrderService';
import { supplierService, SupplierResponse } from '../services/supplierService';
import { Product } from '../types/product';
import loadingService from '../services/loadingService';

export const UpdatePurchaseOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    quantity: '', 
    orderDate: '', 
    ETA: '', 
    orderArrival: '', 
    basePrice: '', 
    totalCost: ''
  });

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  useEffect(() => {
    const loadOrder = async () => {
        if (!id || products.length === 0) return;
    
        try {
            setLoading(true);
            const order = await fetchPurchaseOrderById(id);
            
            // Format dates for HTML date inputs (YYYY-MM-DD)
            const formatDateForInput = (dateString: string) => {
              if (!dateString) return '';
              return new Date(dateString).toISOString().split('T')[0];
            };

            setFormData({
              quantity: order.Quantity ?? '',
              orderDate: formatDateForInput(order.OrderPlacedDateTime),
              ETA: formatDateForInput(order.ETA),
              orderArrival: order.OrderArrivalDateTime ? formatDateForInput(order.OrderArrivalDateTime) : '',
              basePrice: order.BasePrice.toString(),
              totalCost: order.TotalPurchaseCost.toString(),
            });

            const matchedProduct = products.find(p => p.ProductID === order.ProductID);
            if (matchedProduct) {
              setSelectedProduct(matchedProduct);
              setSearchTerm(matchedProduct.Name);
            } else {
              console.warn('Product not found for ID:', order.ProductID);
            }
        } catch (err: any) {
          console.error('Failed to load order:', err);
          loadingService.error('load-purchase-order', 'Failed to load purchase order details. Please try again.');
        } finally {
          setLoading(false);
        }
    };

    loadOrder();
  }, [id, products]);

  const filteredProducts = products.filter(p =>
    p.Name.toLowerCase().startsWith(searchTerm.trim().toLowerCase())
  ); 
  
   // Handle input changes
   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setDropdownOpen(value.trim().length > 0); // Open dropdown if there's input
    };
  
    // Handle product selection
    const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.Name);
    setDropdownOpen(false); // Close dropdown
    };   

  const handleCancel = () => {
    navigate('/purchase-orders');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      loadingService.error('update-purchase-order', 'Please select a product');
      return;
    }

    loadingService.start('update-purchase-order', 'Updating purchase order...');

    const purchaseorder = {
        ProductID: selectedProduct.ProductID,
        SupplierID: selectedProduct.SupplierID,
        Quantity: formData.quantity,
        OrderPlacedDateTime: formData.orderDate,
        ETA: formData.ETA,
        OrderArrivalDateTime: formData.orderArrival || null,
        BasePrice: parseFloat(formData.basePrice),
        TotalPurchaseCost: parseFloat(formData.totalCost),
    };

    try {
      await updatePurchaseOrder(id!, purchaseorder);
      loadingService.success('update-purchase-order', 'Purchase order updated successfully!');
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      loadingService.error('update-purchase-order', 'Failed to update purchase order: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center p-6">Loading purchase order details…</div>
      </div>
    );
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
          <span>Back to Purchase Orders</span>
        </button>
        <h1 className="text-3xl font-bold text-blue-900">EDIT PURCHASE ORDER</h1>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow p-8">
        <form onSubmit={handleSubmit}>
          <div className="bg-blue-50 rounded-lg p-6 space-y-6">

            {/* Product Search and Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label htmlFor="productSearch" className="block text-sm font-bold text-gray-700 mb-2">PRODUCT NAME:</label>
                <input
                  id="productSearch"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search product name"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  required
                />

                {/* Only show list if user typed something */}
                {searchTerm.length > 0 && dropdownOpen && (
                  <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.length === 0 ? (
                      <li className="px-4 py-2 text-sm text-gray-500">No products found.</li>
                    ) : (
                      filteredProducts.map(p => (
                        <li key={p.ProductID}>
                          <button
                            type="button"
                            className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                              selectedProduct?.ProductID === p.ProductID ? 'bg-blue-100 text-blue-900' : ''
                            }`}
                            onClick={() => handleSelectProduct(p)}
                          >
                            {p.Name}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <div>
                <label htmlFor="supplier" className="block text-sm font-bold text-gray-700 mb-2">SUPPLIER NAME:</label>
                <input
                  id="supplier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  value={selectedProduct?.Supplier.Name || ''}
                  disabled
                />
              </div>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="dateordered" className="block text-sm font-bold text-gray-700 mb-2">DATE ORDERED:</label>
                <input
                  id="dateordered"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.orderDate ?? ''}
                  onChange={e => setFormData({ ...formData, orderDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="eta" className="block text-sm font-bold text-gray-700 mb-2">ESTIMATED TIME OF ARRIVAL:</label>
                <input
                  id="eta"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.ETA ?? ''}
                  onChange={e => setFormData({ ...formData, ETA: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="datearrived" className="block text-sm font-bold text-gray-700 mb-2">DATE ARRIVED:</label>
                <input
                  id="datearrived"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.orderArrival}
                  onChange={e => setFormData({ ...formData, orderArrival: e.target.value })}
                />
              </div>
            </div>

            {/* Quantity and Pricing Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="quantity" className="block text-sm font-bold text-gray-700 mb-2">QUANTITY:</label>
                <input
                  id="quantity"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="baseprice" className="block text-sm font-bold text-gray-700 mb-2">BASE PRICE:</label>
                <input
                  id="baseprice"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.basePrice ?? ''}
                  onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="totalcost" className="block text-sm font-bold text-gray-700 mb-2">TOTAL COST:</label>
                <input
                  id="totalcost"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.totalCost}
                  onChange={e => setFormData({ ...formData, totalCost: e.target.value })}
                  required
                />
              </div>
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
  );
};
