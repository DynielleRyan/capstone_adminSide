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
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierResponse | null>(null);
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
    
    // Fetch suppliers
    const loadSuppliers = async () => {
      try {
        const response = await supplierService.getSuppliers({ limit: 1000, isActive: true });
        if (response.success && response.data) {
          setSuppliers(response.data.suppliers);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    const loadOrder = async () => {
        if (!id || products.length === 0 || suppliers.length === 0) return;
    
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
            
            // Set the selected supplier
            const matchedSupplier = suppliers.find(s => s.SupplierID === order.SupplierID);
            if (matchedSupplier) {
              setSelectedSupplier(matchedSupplier);
            } else {
              console.warn('Supplier not found for ID:', order.SupplierID);
            }
        } catch (err: any) {
          console.error('Failed to load order:', err);
          loadingService.error('load-purchase-order', 'Failed to load purchase order details. Please try again.');
        } finally {
          setLoading(false);
        }
    };

    loadOrder();
  }, [id, products, suppliers]);

  // Filter products by both name and ID
  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.toLowerCase().trim();
    const nameMatch = p.Name.toLowerCase().includes(searchLower);
    const idMatch = p.ProductID?.toLowerCase().includes(searchLower);
    return nameMatch || idMatch;
  }); 
  
   // Handle input changes
   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setDropdownOpen(value.trim().length > 0); // Open dropdown if there's input
    
    // Check if the input exactly matches a product ID
    if (value.trim()) {
      const exactIdMatch = products.find(p => 
        p.ProductID?.toLowerCase() === value.trim().toLowerCase()
      );
      if (exactIdMatch) {
        handleSelectProduct(exactIdMatch);
      }
    }
    };
  
    // Handle product selection
    const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.Name);
    setDropdownOpen(false); // Close dropdown
    
    // Auto-select the supplier associated with the product
    const matchedSupplier = suppliers.find(s => s.SupplierID === product.SupplierID);
    if (matchedSupplier) {
      setSelectedSupplier(matchedSupplier);
    }
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

    if (!selectedSupplier) {
      loadingService.error('update-purchase-order', 'Please select a supplier');
      return;
    }

    loadingService.start('update-purchase-order', 'Updating purchase order...');

    const purchaseorder = {
        ProductID: selectedProduct.ProductID,
        SupplierID: selectedSupplier.SupplierID!,
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
                  placeholder="Search by product name or ID"
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
                            <div className="flex items-center justify-between">
                              <span>{p.Name}</span>
                              <span className="text-xs text-gray-500 font-mono ml-2">ID: {p.ProductID}</span>
                            </div>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <div>
                <label htmlFor="supplier" className="block text-sm font-bold text-gray-700 mb-2">SUPPLIER NAME:</label>
                <select
                  id="supplier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSupplier?.SupplierID ?? ''}
                  onChange={(e) => {
                    const supplier = suppliers.find(s => s.SupplierID === e.target.value);
                    setSelectedSupplier(supplier ?? null);
                  }}
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.SupplierID} value={supplier.SupplierID}>
                      {supplier.Name}
                    </option>
                  ))}
                </select>
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
                  min={new Date().toISOString().split("T")[0]} // prevents past dates from being selected
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
                  min={formData.orderDate || new Date().toISOString().split("T")[0]}
                  onChange={e => setFormData({ ...formData, ETA: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="datearrived" className="block text-sm font-bold text-gray-700 mb-2">
                  DATE ARRIVED: <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  id="datearrived"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.orderArrival}
                  min={formData.orderDate || new Date().toISOString().split("T")[0]}
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
                  value={(Number(formData.basePrice || 0) * Number(formData.quantity || 0)).toFixed(2)}
                  readOnly
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
