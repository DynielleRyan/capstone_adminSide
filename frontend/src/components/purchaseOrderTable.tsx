import { useNavigate } from 'react-router-dom';
import { PurchaseOrder } from '../types/purchaseOrder';
import { Search, PenSquare, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <>
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
      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
      onClick={() => navigate('/purchase-orders/new')}
    >
      + ADD PURCHASE ORDER
    </button>
  </div>


  <div className="bg-white rounded-lg shadow overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-blue-900 text-white">
        <tr>
          <th className="px-6 py-4 text-left font-semibold">ORDER ID</th>
          <th className="px-6 py-4 text-left font-semibold">PRODUCT</th>
          <th className="px-6 py-4 text-left font-semibold">SUPPLIER NAME</th>
          <th className="px-6 py-4 text-left font-semibold">DATE ORDERED</th>
          <th className="px-6 py-4 text-left font-semibold">ETA</th>
          <th className="px-6 py-4 text-left font-semibold">DATE ARRIVED</th>
          <th className="px-6 py-4 text-left font-semibold">QUANTITY</th>
          <th className="px-6 py-4 text-left font-semibold">TOTAL COST</th>
          <th className="px-6 py-4 text-left font-semibold">ACTION</th>
        </tr>
      </thead>
      <tbody>
        {paginatedData.map((order, index) => (
          <tr 
            key={order.PurchaseOrderID} 
            className={`${
              index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
            } hover:bg-blue-100 transition-colors`}
          >
            <td className="px-6 py-4 text-gray-700">{String(order.PurchaseOrderID).padStart(2, '0')}</td>
            <td className="px-6 py-4 text-gray-700">
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
                        <span className="font-medium">
                          {order.Product.Name}
                        </span>
                </div>
              </td>
            <td className="px-6 py-4 text-gray-700">{order.Supplier.Name}</td>
            <td className="px-6 py-4 text-gray-700">{new Date(order.OrderPlacedDateTime).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-gray-700">{new Date(order.ETA).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-gray-700">
              {order.OrderArrivalDateTime
                ? new Date(order.OrderArrivalDateTime).toLocaleDateString()
                : '—'}
            </td>
            <td className="px-6 py-4 text-gray-700">{order.Quantity}</td>
            <td className="px-6 py-4 text-gray-700">₱{order.TotalPurchaseCost.toFixed(2)}</td>
            <td className="px-6 py-4">
              <button
                className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
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
</div>

  {/* Pagination */}
  <div className="flex justify-between items-center mt-6">
    <div className="text-sm text-gray-700">
      Showing {paginatedData.length} of {displayedOrders.length} orders
    </div>
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setCurrentPage((prev) => prev - 1)}
        disabled={currentPage === 1}
        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-4 py-2 text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <button 
        onClick={() => setCurrentPage((prev) => prev + 1)}
        disabled={currentPage === totalPages}
        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>

</>
  );
};
