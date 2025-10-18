import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProducts } from '../services/productService';
import { fetchPurchaseOrderById, updatePurchaseOrder } from '../services/purchaseOrderService';
import { Product } from '../types/product';

export const UpdatePurchaseOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
        } catch (err) {
          console.error('Failed to load purchase order:', err);
          alert('Failed to load purchase order details. Please try again.');
        } finally {
          setLoading(false);
        }
    };

    loadOrder();
  }, [id, products]);

  const filteredProducts = products.filter(p =>
    p.Name.startsWith(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const purchaseorder = {
        ProductID: selectedProduct.ProductID,
        SupplierID: selectedProduct.SupplierID,
        Quantity: formData.quantity,
        OrderPlacedDateTime: formData.orderDate,
        ETA: formData.ETA,
        OrderArrivalDateTime: formData.orderArrival || null,
        BasePrice: parseInt(formData.basePrice),
        TotalPurchaseCost: parseInt(formData.totalCost),
    };

    try {
      await updatePurchaseOrder(id!, purchaseorder);
      alert('Purchase order updated!');
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      alert('Failed to update purchase order. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center p-6">Loading purchase order details…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-base-200 rounded-box shadow-md">
      <h2 className="text-xl font-bold">Edit Purchase Order</h2>

      {/* 🔍 Product Search */}
      <div>
        <label htmlFor="productSearch" className="label">Product</label>
        <input
          id="productSearch"
          type="text"
          className="input input-bordered w-full"
          placeholder="Search product name"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          required
        />

      {/* ✅ Only show list if user typed something */}
      {searchTerm.length > 0 && (
        <ul className="menu bg-base-100 w-full mt-2 rounded-box shadow max-h-60 overflow-auto">
          {filteredProducts.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500">No products found.</li>
          ) : (
          filteredProducts.map(p => (
            <li key={p.ProductID}>
              <button
                type="button"
                className={`w-full text-left ${selectedProduct?.ProductID === p.ProductID ? 'bg-primary text-white' : ''}`}
                onClick={() => {
                setSelectedProduct(p);
                setSearchTerm(p.Name);
                }}
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
        <label htmlFor="supplier" className="label">Supplier</label>
        <input
        id="supplier"
          className="input input-bordered w-full"
          value={selectedProduct?.Supplier.Name || ''}
          disabled
        />
      </div>

      <div>
        <label htmlFor="dateordered" className="label">Order Date</label>
        <input
        id="dateordered"
          type="date"
          className="input input-bordered w-full"
          value={formData.orderDate ?? ''}
          onChange={e => setFormData({ ...formData, orderDate: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="eta" className="label">ETA</label>
        <input
        id="eta"
          type="date"
          className="input input-bordered w-full"
          value={formData.ETA ?? ''}
          onChange={e => setFormData({ ...formData, ETA: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="datearrived" className="label">Date Arrived</label>
        <input
        id="datearrived"
          type="date"
          className="input input-bordered w-full"
          value={formData.orderArrival}
          onChange={e => setFormData({ ...formData, orderArrival: e.target.value })}
        />
      </div>

      <div>
          <label htmlFor="quantity" className="label">Quantity</label>
          <input
          id="quantity"
            type="number"
            className="input input-bordered w-full"
            value={formData.quantity}
            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
            required
          />
        </div>

      <div>
        <label htmlFor="baseprice" className="label">Base Price</label>
        <input
        id="baseprice"
          type="string"
          className="input input-bordered w-full"
          value={formData.basePrice ?? ''}
          onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="totalcost" className="label">Total Purchase Cost</label>
        <input
        id="totalcost"
          type="string"
          className="input input-bordered w-full"
          value={formData.totalCost}
          onChange={e => setFormData({ ...formData, totalCost: e.target.value })}
          required
        />
      </div>

      <button className="btn btn-primary w-full" type="submit">
        Submit Order
      </button>
    </form>
  );
};
