import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types/product';
import { PurchaseOrderForms } from '../types/PurchaseOrderForms';
import { fetchProducts } from '../services/purchaseOrderService';
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

  const handleCancel = () => {
    navigate('/purchase-orders');
  };
  

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
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-4xl mx-auto p-6 rounded-box shadow-md bg-blue-100 text-black"
    >
    <h2 className="text-xl font-bold">ADD PURCHASE ORDER</h2>

  {/* Product Search */}
  <div className="flex gap-4">
    <div className="flex-1">
      <label htmlFor="productSearch" className="label">PRODUCT NAME</label>
      <input
        id="productSearch"
        type="text"
        className="input input-bordered w-full bg-white text-black border-blue-900"
        placeholder="Search product name"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        required
      />
      {searchTerm.length > 0 && filteredProducts.length > 0 && (
        <ul className="menu bg-base-100 w-full mt-2 rounded-box shadow max-h-60 overflow-auto">
          {filteredProducts.map((p) => (
            <li key={p.ProductID}>
              <button
                type="button"
                className="w-full text-left bg-white text-black"
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

    <div className="flex-1">
      <label htmlFor="supplier" className="label">SUPPLIER NAME</label>
      <input
        id="supplier"
        className="input input-bordered w-full bg-white text-black  border-blue-900"
        value={selectedProduct?.Supplier.Name || ''}
        disabled
      />
    </div>
  </div>

  {/* Dates Row */}
  <div className="flex gap-4">
    <div className="flex-1">
      <label htmlFor="dateordered" className="label">DATE ORDERED</label>
      <input
        id="dateordered"
        type="date"
        className="input input-bordered w-full bg-white text-black border-blue-900"
        value={formData.orderDate}
        onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
        required
      />
    </div>

    <div className="flex-1">
      <label htmlFor="eta" className="label">ESTIMATED TIME OF ARRIVAL</label>
      <input
        id="eta"
        type="date"
        className="input input-bordered w-full bg-white text-black border-blue-900"
        value={formData.ETA}
        onChange={(e) => setFormData({ ...formData, ETA: e.target.value })}
        required
      />
    </div>

    <div className="flex-1">
      <label htmlFor="datearrived" className="label">DATE ARRIVED</label>
      <input
        id="datearrived"
        type="date"
        className="input input-bordered w-full bg-white text-black border-blue-900"
        value={formData.orderArrival}
        onChange={(e) => setFormData({ ...formData, orderArrival: e.target.value })}
      />
    </div>
  </div>

  {/* Quantity and Pricing Row */}
  <div className="flex gap-4">
    <div className="flex-1">
      <label htmlFor="quantity" className="label">QUANTITY</label>
      <input
        id="quantity"
        type="text"
        className="input input-bordered w-full bg-white text-black border-blue-900"
        value={formData.quantity}
        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
        required
      />
    </div>

    <div className="flex-1">
      <label htmlFor="baseprice" className="label">BASE PRICE</label>
      <input
        id="baseprice"
        type="text"
        className="input input-bordered w-full bg-white text-black border-blue-900"
        value={formData.basePrice}
        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
        required
      />
    </div>

    <div className="flex-1">
      <label htmlFor="totalcost" className="label">TOTAL COST</label>
      <input
        id="totalcost"
        type="text"
        className="input input-bordered w-full bg-white text-black border-blue-900"
        value={formData.totalCost}
        onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
        required
      />
    </div>
  </div>

  {/* Action Buttons */}
  <div className="flex gap-4">
    <button className="btn bg-blue-900 text-white w-half" type="submit">
      CONFIRM
    </button>
    <button
      type="button"
      className="btn bg-white text-blue-900 border-blue-900 w-half"
      onClick={handleCancel}
    >
      CANCEL
    </button>
  </div>
</form>

  );
};
