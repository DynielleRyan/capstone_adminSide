import { useNavigate } from 'react-router-dom';
import { PurchaseOrder } from '../types/purchaseOrder';


interface Props {
  orders: PurchaseOrder[];
}

export const PurchaseOrderTable: React.FC<Props> = ({ orders }) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-bold uppercase text-black">Purchase Orders</h2>
    <button
      className="btn btn-sm btn-primary font-semibold uppercase tracking-wide"
      onClick={() => navigate('/purchase-orders/new')}
    >
      + Add Purchase Order
    </button>
  </div>

  <div className="overflow-x-auto">
    <table className="table w-full text-sm">
      <thead className="bg-primary text-white text-xs uppercase font-bold">
        <tr>
          <th>Order ID</th>
          <th>Product</th>
          <th>Supplier Name</th>
          <th>Date Ordered</th>
          <th>ETA</th>
          <th>Date Arrived</th>
          <th>Quantity</th>
          <th>Total Cost</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order, index) => (
          <tr key={order.PurchaseOrderID} className={index % 2 === 0 ? 'bg-white' : 'bg-base-100'}>
            <td className="font-medium">{String(order.PurchaseOrderID).padStart(2, '0')}</td>
            <td className="uppercase">{order.Product.Name}</td>
            <td>{order.Supplier.Name}</td>
            <td>{new Date(order.OrderPlacedDateTime).toLocaleDateString()}</td>
            <td>{new Date(order.ETA).toLocaleDateString()}</td>
            <td>
              {order.OrderArrivalDateTime
                ? new Date(order.OrderArrivalDateTime).toLocaleDateString()
                : '—'}
            </td>
            <td>{order.Quantity}</td>
            <td>₱{order.TotalPurchaseCost.toFixed(2)}</td>
            <td>
              <button
                className="btn btn-xs btn-primary font-semibold uppercase"
                onClick={() => navigate(`/purchase-orders/${order.PurchaseOrderID}`)}
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <div className="flex justify-end mt-4">
    <div className="join">
      <button className="join-item btn btn-sm btn-disabled">&lt;</button>
      <button className="join-item btn btn-sm btn-primary">1</button>
      <button className="join-item btn btn-sm">2</button>
      <button className="join-item btn btn-sm">3</button>
      <button className="join-item btn btn-sm">&gt;</button>
    </div>
  </div>
</div>

  );
};
