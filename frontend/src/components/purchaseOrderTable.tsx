import { useNavigate } from 'react-router-dom';
import { PurchaseOrder } from '../types/purchaseOrder';
import { Search, PenSquare } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';



interface Props {
  orders: PurchaseOrder[];
}

export const PurchaseOrderTable: React.FC<Props> = ({ orders }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('none');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  

   // 🔍 Search function
   function filterPurchaseOrders(orders: PurchaseOrder[], searchTerm: string): PurchaseOrder[] {
    const term = searchTerm.toLowerCase();
  
    return orders.filter((po) => {
      const poID = String(po.PurchaseOrderID).toLowerCase();
      const product = po.Product.Name.toLowerCase();
      const supplierName = po.Supplier.Name.toLowerCase();
      const orderDate = new Date(po.OrderPlacedDateTime).toLocaleDateString().toLowerCase();
      const ETA = new Date(po.ETA).toLocaleDateString().toLowerCase();
      const orderArrival = po.OrderArrivalDateTime
        ? new Date(po.OrderArrivalDateTime).toLocaleDateString().toLowerCase()
        : '';
      const quantity = String(po.Quantity).toLowerCase();
      const total = po.TotalPurchaseCost.toFixed(2).toLowerCase();
  
      return (
        poID.includes(term) ||
        product.includes(term) ||
        supplierName.includes(term) ||
        orderDate.includes(term) ||
        ETA.includes(term) ||
        orderArrival.includes(term) ||
        quantity.includes(term) ||
        total.includes(term)
      );
    });
  }
  

  // 🔃 Sort function
  function sortPurchaseOrders(orders: PurchaseOrder[], sortBy: string): PurchaseOrder[] {
    if (sortBy === 'none') return orders;
  
    const sorted = [...orders];
  
    if (sortBy === 'total-asc') {
      sorted.sort((a, b) => a.TotalPurchaseCost - b.TotalPurchaseCost);
    } else if (sortBy === 'total-desc') {
      sorted.sort((a, b) => b.TotalPurchaseCost - a.TotalPurchaseCost);
    } else if (sortBy === 'date-asc') {
      sorted.sort(
        (a, b) =>
          new Date(a.OrderPlacedDateTime).getTime() - new Date(b.OrderPlacedDateTime).getTime()
      );
    } else if (sortBy === 'date-desc') {
      sorted.sort(
        (a, b) =>
          new Date(b.OrderPlacedDateTime).getTime() - new Date(a.OrderPlacedDateTime).getTime()
      );
    } else if (sortBy === 'eta-asc') {
      sorted.sort(
        (a, b) =>
          new Date(a.ETA).getTime() - new Date(b.ETA).getTime()
      );
    } else if (sortBy === 'eta-desc') {
      sorted.sort(
        (a, b) =>
          new Date(b.ETA).getTime() - new Date(a.ETA).getTime()
      );
    }

    return sorted;
  }

  // 🧠 Combine search and sort in render logic
  const displayedOrders = useMemo(() => {
    const filtered = filterPurchaseOrders(orders, searchTerm);
    return sortPurchaseOrders(filtered, sortBy);
  }, [orders, searchTerm, sortBy]);

  const totalPages = Math.ceil(displayedOrders.length / itemsPerPage);

  const paginatedData = useMemo(() => {
  const start = (currentPage - 1) * itemsPerPage;
  return displayedOrders.slice(start, start + itemsPerPage);
  }, [displayedOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);
  

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">PURCHASE ORDER</h1>
      </div>

        {/* Search, Sort, and Downlaod*/}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Sort By:</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <option value="none">None</option>
            <option value="total-asc">Total Cost (Low to High)</option>
            <option value="total-desc">Total Cost (High to Low)</option>
            <option value="date-asc">Date Ordered (Oldest First)</option>
            <option value="date-desc">Date Ordered (Newest First)</option>
            <option value="eta-asc">ETA (Oldest First)</option>
            <option value="eta-desc">ETA (Newest First)</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search transactions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </div>
    <button
      className="bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded uppercase hover:bg-blue-600 transition-colors"
      onClick={() => navigate('/purchase-orders/new')}
      style={{ backgroundColor: '#3498db' }}
    >
      + Add Purchase Order
    </button>
  </div>


  <div className="bg-white rounded-lg shadow overflow-hidden">
  <div className="overflow-x-auto">
    <table className="table w-full text-sm">
      <thead className="bg-blue-900 text-white">
        <tr>
          <th>ORDER ID</th>
          <th>PRODUCT</th>
          <th>SUPPLIER NAME</th>
          <th>DATE ORDERED</th>
          <th>ETA</th>
          <th>DATE ARRIVED</th>
          <th>QUANTITY</th>
          <th>TOTAL COST</th>
          <th>ACTION</th>
        </tr>
      </thead>
      <tbody style={{ color: '#374151' }}>
        {paginatedData.map((order) => (
          <tr key={order.PurchaseOrderID} className="border-b" style={{ backgroundColor: '#e0f2f7', borderColor: '#e5e7eb' }}>
            <td className="font-medium">{String(order.PurchaseOrderID).padStart(2, '0')}</td>
            <td className="uppercase">
              <div className="flex items-center gap-3">
                        {order.Product.Image ? (
                          <img
                            src={order.Product.Image}
                            alt={order.Product.Name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-200 rounded flex items-center justify-center">
                            <span className="text-blue-600 text-sm">
                              {order.Product.Name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-gray-700 font-medium">
                          {order.Product.Name}
                        </span>
                </div>
              </td>
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
                className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-100" 
                onClick={() => navigate(`/purchase-orders/${order.PurchaseOrderID}`)}
              >
                <PenSquare className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/*Pagination Controls*/}
  <div className="flex justify-center mt-4">
  <div className="join">
    <button
      type="button"
      className="join-item btn btn-sm"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((prev) => prev - 1)}
    >
      Prev
    </button>

    {[...Array(totalPages)].map((_, i) => (
      <button
        key={i}
        type="button"
        className={`join-item btn btn-sm ${currentPage === i + 1 ? 'btn-active' : ''}`}
        onClick={() => setCurrentPage(i + 1)}
      >
        {i + 1}
      </button>
    ))}

    <button
      type="button"
      className="join-item btn btn-sm"
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage((prev) => prev + 1)}
    >
      Next
    </button>
  </div>
  </div>

</div>
</div>
  );
};
