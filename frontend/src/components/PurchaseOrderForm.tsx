import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types/product';
import { PurchaseOrderForms } from '../types/PurchaseOrderForms';
import { fetchProducts } from '../services/productService';
import { createPurchaseOrder } from '../services/purchaseOrderService';

export const PurchaseOrderForm = () => {

  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [formData, setFormData] = useState({  quantity: '', orderDate: '', ETA: '', orderArrival: '', basePrice: '', totalCost: '' });


  const filteredProducts = products.filter(p =>
    p.Name.toLowerCase().startsWith(searchTerm.toLowerCase())
  );
  
  
  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const purchaseorder: PurchaseOrderForms = {
      ProductID: selectedProduct.ProductID,
      SupplierID: selectedProduct.SupplierID,
      Quantity: formData.quantity,
      OrderPlacedDateTime: formData.orderDate,
      ETA: formData.ETA,
      OrderArrivalDateTime: formData.orderArrival || null,
      BasePrice: parseFloat(formData.basePrice),
      TotalPurchaseCost: parseFloat(formData.totalCost),
    };

    await createPurchaseOrder(purchaseorder);
    alert('Purchase Order created!');
    navigate('/purchase-orders');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-base-200 rounded-box shadow-md">
      <h2 className="text-xl font-bold">Create Purchase Order</h2>

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
  {searchTerm.length > 0 && filteredProducts.length > 0 && (
  <ul className="menu bg-base-100 w-full mt-2 rounded-box shadow max-h-60 overflow-auto">
    {filteredProducts.map(p => (
      <li key={p.ProductID}>
        <button
          type="button"
          className="w-full text-left"
          onClick={() => {
            setSelectedProduct(p);
            setSearchTerm(p.Name);
          }}
        >
          {p.Name}
        </button>
      </li>
    ))}
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
          value={formData.orderDate}
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
          value={formData.ETA}
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
          type="string"
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
          value={formData.basePrice}
          onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="totalcost" className="label">Total Purchase Cost</label>
        <input
        id="totalcost"
          type="number"
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
