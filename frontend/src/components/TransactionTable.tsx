/* eslint-disable react/forbid-dom-props */
import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';
import { fetchTransactionWithItems, fetchTransactionQtyMap } from '../services/transactionService';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<Props> = ({ transactions }) => {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("none");
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!transactions.length) return;
    const ids = transactions.map((t) => t.TransactionID);
    fetchTransactionQtyMap(ids)
      .then(setQtyMap)
      .catch(() => setQtyMap({}));
  }, [transactions]);
    

  const handleView = async (id: string) => {
    const result = await fetchTransactionWithItems(id);
    if (!result) {
      setErrorMessage("Transaction not found or failed to load.");
      setSelectedTransaction(null);
      setItems([]);
    } else {
      setSelectedTransaction(result.transaction);
      setItems(result.items);
      setErrorMessage(null);
    }

    const modal = document.getElementById(
      "transaction_modal"
    ) as HTMLDialogElement;
    modal?.showModal();
  };

  // Calculate the total discount in each transaction
  const calculateTotalDiscount = (items: TransactionItem[]): number => {
    return items.reduce((sum, item) => {
      const discountPercent = item.DiscountID ? item.Discount?.DiscountPercent || 0 : 0;
      const discountAmount = (discountPercent / 100) * (item.Product.SellingPrice*item.Quantity);
      return sum + discountAmount;
    }, 0);
  };
  
  

  const handleDownloadCSV = () => {
    // Prepare CSV headers for all Transaction table columns (excluding User table)
    const headers = [
      "TransactionID",
      "UserID",
      "Total",
      "PaymentMethod",
      "VATAmount",
      "OrderDateTime",
      "CashReceived",
      "PaymentChange",
      "ReferenceNo",
      "QTY",
    ];

    // Prepare CSV data with all Transaction table fields
    const csvData = transactions.map((tx) => [
      tx.TransactionID,
      tx.UserID,
      tx.Total.toString(),
      tx.PaymentMethod,
      tx.VATAmount,
      tx.OrderDateTime,
      tx.CashReceived,
      tx.PaymentChange,
      tx.ReferenceNo,
      qtyMap[tx.TransactionID] ?? 0,
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `transactions_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔍 Search function
  function filterTransactions(
    transactions: Transaction[],
    searchTerm: string
  ): Transaction[] {
    const term = searchTerm.toLowerCase();

    return transactions.filter((tx) => {
      const txnId = String(tx.TransactionID).toLowerCase();
      const staffName = `${tx.User.FirstName} ${tx.User.LastName}`.toLowerCase();
      const payment = String(tx.PaymentMethod).toLowerCase();
      const date = new Date(tx.OrderDateTime).toLocaleDateString().toLowerCase();
      const total = tx.Total.toFixed(2).toLowerCase();

      return (
        txnId.includes(term) ||
        staffName.includes(term) ||
        payment.includes(term) ||
        date.includes(term) ||
        total.includes(term)
      );
    });
  }

  // 🔃 Sort function
  function sortTransactions(
    transactions: Transaction[],
    sortBy: string
  ): Transaction[] {
    if (sortBy === "none") return transactions;

    const sorted = [...transactions];

    if (sortBy === "total-asc") {
      sorted.sort((a, b) => a.Total - b.Total);
    } else if (sortBy === "total-desc") {
      sorted.sort((a, b) => b.Total - a.Total);
    } else if (sortBy === "date-asc") {
      sorted.sort(
        (a, b) =>
          new Date(a.OrderDateTime).getTime() -
          new Date(b.OrderDateTime).getTime()
      );
    } else if (sortBy === "date-desc") {
      sorted.sort(
        (a, b) =>
          new Date(b.OrderDateTime).getTime() -
          new Date(a.OrderDateTime).getTime()
      );
    }

    return sorted;
  }

  // 🧠 Combine search and sort in render logic
  const displayedTransactions = useMemo(() => {
    const filtered = filterTransactions(transactions, searchTerm);
    return sortTransactions(filtered, sortBy);
  }, [transactions, searchTerm, sortBy]);

  const totalPages = Math.ceil(displayedTransactions.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedTransactions.slice(start, start + itemsPerPage);
  }, [displayedTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">TRANSACTION</h1>
      </div>

      {/* Search, Sort, and Downlaod*/}
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
              <option value="total-asc">Total (Low to High)</option>
              <option value="total-desc">Total (High to Low)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="date-desc">Date (Newest First)</option>
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

        {/* Download CSV Button */}
        <div className="flex gap-3">
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            onClick={handleDownloadCSV}
          >
            DOWNLOAD CSV
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">TXN ID</th>
              <th className="px-6 py-4 text-left font-semibold">DATE ORDERED</th>
              <th className="px-6 py-4 text-left font-semibold">STAFF</th>
              <th className="px-6 py-4 text-left font-semibold">PAYMENT METHOD</th>
              <th className="px-6 py-4 text-left font-semibold">QTY</th>
              <th className="px-6 py-4 text-left font-semibold">TOTAL</th>
              <th className="px-6 py-4 text-left font-semibold">VIEW</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((tx, index) => (
              <tr 
                key={tx.TransactionID} 
                className={`${
                  index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                } hover:bg-blue-100 transition-colors`}
              >
                <td className="px-6 py-4 text-gray-700">
                  {String(tx.TransactionID).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  <div>
                    {new Date(tx.OrderDateTime).toLocaleDateString('en-US', { 
                      month: 'numeric', 
                      day: 'numeric', 
                      year: 'numeric'
                    })}
                    <br />
                    {new Date(tx.OrderDateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  <div className="font-medium">{tx.User.FirstName} {tx.User.LastName}</div>
                </td>
                <td className="px-6 py-4 text-gray-700">{tx.PaymentMethod}</td>
                <td className="px-6 py-4 text-gray-700">
                  {qtyMap[tx.TransactionID] ?? 0}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  ₱{tx.Total.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                    onClick={() => handleView(tx.TransactionID)}
                    title="View Transaction Details"
                  >
                    <Eye className="w-4 h-4" />
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
          Showing {paginatedData.length} of {displayedTransactions.length}{" "}
          transactions
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

      {/* Transaction Modal */}
      <dialog id="transaction_modal" className="modal">
        <div className="modal-box bg-white rounded-lg w-full max-w-4xl max-h-[90vh] p-0 text-black flex flex-col">
          {errorMessage ? (
            <div className="p-6">
              <div className="text-red-500 font-semibold">{errorMessage}</div>
              <div className="mt-6 flex justify-end">
                <form method="dialog">
                  <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors">
                    Close
                  </button>
                </form>
              </div>
            </div>
          ) : selectedTransaction ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transaction Details
                </h3>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p>
                    <strong>ID:</strong> {selectedTransaction.TransactionID}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(
                      selectedTransaction.OrderDateTime
                    ).toLocaleString()}
                  </p>
                  <p>
                    <strong>Staff:</strong> {selectedTransaction.User.FirstName}{" "}
                    {selectedTransaction.User.LastName}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Items</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">
                          ITEM
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          PRICE
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          QUANTITY
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          SUBTOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          key={item.TransactionItemID}
                          className={`${
                            index % 2 === 0 ? "bg-blue-50" : "bg-white"
                          } hover:bg-blue-100 transition-colors`}
                        >
                          <td className="px-6 py-4 text-gray-700">
                            {item.Product.Name}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            ₱{item.Product.SellingPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {item.Quantity}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            ₱{item.Subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 space-y-2 text-sm text-right">
                  <p className="text-gray-700"><strong>SUBTOTAL:</strong> ₱{items.reduce((sum, item) => sum + (item.Product.SellingPrice*item.Quantity), 0).toFixed(2)}</p>
                  <p className="text-gray-700"><strong>DISCOUNT:</strong> ₱{calculateTotalDiscount(items).toFixed(2)}</p>
                  <p className="text-gray-700"><strong>VAT AMOUNT:</strong> ₱{selectedTransaction.VATAmount.toFixed(2)}</p>
                  <p className="text-lg font-semibold text-gray-900"><strong>TOTAL:</strong> ₱{selectedTransaction.Total.toFixed(2)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
                <form method="dialog">
                  <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors">
                    Close
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="p-6">
              <p className="text-sm text-gray-500">No transaction selected.</p>
              <div className="mt-6 flex justify-end">
                <form method="dialog">
                  <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors">
                    Close
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
};
