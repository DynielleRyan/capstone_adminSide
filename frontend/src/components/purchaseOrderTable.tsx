import { useNavigate } from 'react-router-dom';
import { PurchaseOrder } from '../types/purchaseOrder';


interface Props {
  orders: PurchaseOrder[];
}

export const PurchaseOrderTable: React.FC<Props> = ({ orders }) => {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Purchase Orders</h2>
        <button className="btn btn-primary" onClick={() => navigate('/purchase-orders/new')}>
          Add Purchase Order
        </button>
      </div>

      <table className="table table-zebra w-full">
        <thead>
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
          {orders.map(order => (
            <tr key={order.PurchaseOrderID}>
              <td>{order.PurchaseOrderID}</td>
              <td>{order.Product.Name}</td>
              <td>{order.Supplier.Name}</td>
              <td>{new Date(order.OrderPlacedDateTime).toLocaleDateString()}</td>
              <td>{new Date(order.ETA).toLocaleDateString()}</td>
              <td>{order.OrderArrivalDateTime ? new Date(order.OrderArrivalDateTime).toLocaleDateString() : ' '}</td>
              <td>{order.Quantity}</td>
              <td>{order.TotalPurchaseCost.toFixed(2)}</td>
              <td>
                <button className="btn btn-sm btn-outline btn-primary" onClick={() => navigate(`/purchase-orders/${order.PurchaseOrderID}`)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
