import { useNavigate } from "react-router-dom";
import { PurchaseOrder } from "../types/purchaseOrder";
import { Search, PenSquare, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

interface Props {
  orders: PurchaseOrder[];
}

export const PurchaseOrderTable: React.FC<Props> = ({ orders }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [copiedPurchaseOrderIDs, setCopiedPurchaseOrderIDs] = useState<Set<string>>(new Set());

  // 🔍 Search function
  function filterPurchaseOrders(
    orders: PurchaseOrder[],
    searchTerm: string
  ): PurchaseOrder[] {
    const term = searchTerm.toLowerCase();

    return orders.filter((po) => {
      const poID = String(po.PurchaseOrderID).toLowerCase();
      const product = po.Product.Name.toLowerCase();
      const supplierName = po.Supplier.Name.toLowerCase();
      const orderDate = new Date(po.OrderPlacedDateTime)
        .toLocaleDateString()
        .toLowerCase();
      const ETA = new Date(po.ETA).toLocaleDateString().toLowerCase();
      const orderArrival = po.OrderArrivalDateTime
        ? new Date(po.OrderArrivalDateTime).toLocaleDateString().toLowerCase()
        : "";
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
  function sortPurchaseOrders(
    orders: PurchaseOrder[],
    sortBy: string
  ): PurchaseOrder[] {
    if (sortBy === "none") return orders;

    const sorted = [...orders];

    if (sortBy === "total-asc") {
      sorted.sort((a, b) => a.TotalPurchaseCost - b.TotalPurchaseCost);
    } else if (sortBy === "total-desc") {
      sorted.sort((a, b) => b.TotalPurchaseCost - a.TotalPurchaseCost);
    } else if (sortBy === "date-asc") {
      sorted.sort(
        (a, b) =>
          new Date(a.OrderPlacedDateTime).getTime() -
          new Date(b.OrderPlacedDateTime).getTime()
      );
    } else if (sortBy === "date-desc") {
      sorted.sort(
        (a, b) =>
          new Date(b.OrderPlacedDateTime).getTime() -
          new Date(a.OrderPlacedDateTime).getTime()
      );
    } else if (sortBy === "eta-asc") {
      sorted.sort(
        (a, b) => new Date(a.ETA).getTime() - new Date(b.ETA).getTime()
      );
    } else if (sortBy === "eta-desc") {
      sorted.sort(
        (a, b) => new Date(b.ETA).getTime() - new Date(a.ETA).getTime()
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

  // Copy purchase order ID to clipboard
  const copyPurchaseOrderID = async (purchaseOrderID: string) => {
    try {
      await navigator.clipboard.writeText(purchaseOrderID);
      setCopiedPurchaseOrderIDs(prev => new Set(prev).add(purchaseOrderID));
      setTimeout(() => {
        setCopiedPurchaseOrderIDs(prev => {
          const next = new Set(prev);
          next.delete(purchaseOrderID);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">
          PURCHASE ORDER
        </h1>

      {/* Search and Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="sortBy"
              className="text-sm font-medium text-gray-700"
            >
              Sort By:
            </label>
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
          className="bg-blue-900 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          onClick={() => navigate('/purchase-orders/new')}
        >
          + ADD PURCHASE ORDER
        </button>
      </div>

      {/* Purchase Order Table */}
      <div className="bg-white shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">ID</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">PRODUCT</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">SUPPLIER NAME</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">DATE ORDERED</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">ETA</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">DATE ARRIVED</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">QUANTITY</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">TOTAL COST</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">ACTION</th>
              </tr>
            </thead>
            <tbody className=" bg-blue-50">
              {paginatedData.map((order => (
              <tr key={order.PurchaseOrderID} >
                <td className="px-4 py-4 text-gray-700 text-center border border-white">
                  <div className="flex items-center justify-center gap-2">
                    <span>{String(order.PurchaseOrderID).padStart(2, '0')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyPurchaseOrderID(order.PurchaseOrderID);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Copy Purchase Order ID"
                    >
                      {copiedPurchaseOrderIDs.has(order.PurchaseOrderID) ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-600 hover:text-blue-600" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-2 py-4 text-gray-700 text-center border border-white">
                  <div className="flex items-center gap-2">
                        {order.Product.Image ? (
                          <img
                          src={order.Product.Image}
                          alt={order.Product.Name}
                          className="w-8 h-8 object-cover rounded"
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
                <td className="px-4 py-4 text-gray-700 text-center border border-white">{order.Supplier.Name}</td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">{new Date(order.OrderPlacedDateTime).toLocaleDateString()}</td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">{new Date(order.ETA).toLocaleDateString()}</td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">
                  {order.OrderArrivalDateTime
                  ? new Date(order.OrderArrivalDateTime).toLocaleDateString()
                  : '—'}
                </td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">{order.Quantity}</td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">₱{order.TotalPurchaseCost.toFixed(2)}</td>
                <td className="px-4 py-4 border border-white">
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700"
                    onClick={() => navigate(`/purchase-orders/${order.PurchaseOrderID}`)}
                    title="Edit Purchase Order Details"
                  >
                    <PenSquare className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {paginatedData.length} of {itemsPerPage} purchase orders
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
    </div>
    </div>
  );
};
