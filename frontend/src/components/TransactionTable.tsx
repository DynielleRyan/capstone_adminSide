/* eslint-disable react/forbid-dom-props */
import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';
import { fetchTransactionWithItems, fetchTransactionQtyMap } from '../services/transactionService';
import { Search, Eye, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<Props> = ({ transactions }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("none");
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
    
  // View transaction details
  const handleView = async (id: string) => {
    const result = await fetchTransactionWithItems(id);
    if (!result) {
      setErrorMessage("Transaction not found.");
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

  // Prepare CSV headers for all Transaction table columns
  const handleDownloadCSV = () => {
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

  // Search function
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

  // Sort function
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

  // Combine search and sort in render logic
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
    <div className="p-6 bg-white min-h-screen">
      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">TRANSACTION</h1>

      {/* Search, Sort, and Download*/}
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="None"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Download CSV Button */}
          <button
            className="bg-blue-900 text-white px-6 py-2 rounded-md hover:bg-blue-500 transition-colors flex items-center gap-2"
            onClick={handleDownloadCSV}
          >
            DOWNLOAD CSV 
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">TXN ID</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">DATE ORDERED</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">STAFF</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">PAYMENT METHOD</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">QTY</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">TOTAL</th>
              <th className="px-6 py-4 text-center font-semibold">VIEW</th>
            </tr>
          </thead>
          <tbody className=" bg-blue-50">
            {paginatedData.map((tx, index) => (
              <tr key={tx.TransactionID} >
                <td className="px-6 py-4 text-gray-700 border border-white">{String(tx.TransactionID).padStart(2, '0')}</td>
                <td className="px-6 py-4 text-gray-700 text-center border border-white">
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
                <td className="px-6 py-4 text-gray-700 text-center border border-white">
                  <div className="font-medium">{tx.User.FirstName} {tx.User.LastName}</div>
                </td>
                <td className="px-6 py-4 text-gray-700 text-center border border-white">{tx.PaymentMethod}</td>
                <td className="px-6 py-4 text-gray-700 text-center border border-white">{qtyMap[tx.TransactionID] ?? 0}</td>
                <td className="px-6 py-4 text-gray-700 text-center border border-white">₱{tx.Total.toFixed(2)}</td>
                <td className="px-6 py-4 border border-white">
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
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {paginatedData.length} of {itemsPerPage} transactions
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
        <div className="modal-box bg-white rounded-lg w-full max-w-4xl max-h-[90vh] p-4 text-black flex flex-col">
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
            <div className="px-6 pt-2 flex-shrink-0">
                <form method="dialog">
                <button                     
                    className="bg-transparent border-none cursor-pointer rounded flex items-center justify-center hover:bg-gray-200 text-gray-700" 
                  >
                    <ArrowLeft className="w-8 h-8" />
                  </button>
                </form>
            </div>
              {/* Header */}
              <div className="px-6 pb-2 flex-shrink-0">
                <h1 className="text-3xl text-center font-semibold text-gray-900">TRANSACTION DETAILS</h1>
                  <hr className=" my-4 border-t-2 item-center border-gray-400"/>
                  
                  {/* Basic Details */}
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 space-y-3">
                      <p><strong>TRANSACTION ID:</strong></p>
                      <p><strong>DATE ORDERED:</strong></p>
                      <p><strong>STAFF:</strong></p>
                      <p><strong>PAYMENT OPTION:</strong></p>
                    </div>

                    <div className="flex-shrink-0 pl-4 space-y-3">
                      <p>{selectedTransaction.TransactionID}</p>
                      <p>
                        {" "}
                        {new Date(
                        selectedTransaction.OrderDateTime
                        ).toLocaleString()}
                      </p>
                      <p>{selectedTransaction.User.FirstName}{" "}{selectedTransaction.User.LastName}</p>
                      <p>{selectedTransaction.PaymentMethod}</p>
                    </div>
                  </div>
              </div>

                {/* Item List */}
                <div className="flex gap-6 px-6">
                  <div className="flex-shrink-0 ">
                    <p><strong>ITEM LIST:</strong></p>
                  </div>

                  <div className="flex-shrink-0 pl-20 pt-2">
                    <table className="w-[610px] text-sm text-black border border-black">
                      <thead className="border border-black">
                      <tr>
                        <th className="px-6 py-3 border border-black text-center font-semibold">ITEM</th>
                        <th className="px-6 py-3 border border-black text-center font-semibold">PRICE</th>
                        <th className="px-6 py-3 border border-black text-center font-semibold">QTY</th>
                        <th className="px-6 py-3 border border-black text-center font-semibold">SUBTOTAL</th>
                      </tr>
                      </thead>
                      <tbody>
                      {items.map((item, index) => (
                        <tr key={item.TransactionItemID}>
                          <td className="px-6 py-4 text-gray-700 border border-black font-semibold"> 
                            <div className="flex items-center gap-2">
                              {item.Product.Image ? (
                                <img
                                  src={item.Product.Image}
                                  alt={item.Product.Name}
                                  className="w-8 h-8 object-cover rounded"
                                />
                              ) : (
                              <div className="w-12 h-12 bg-blue-200 rounded flex items-center justify-center">
                                <span className="text-blue-600 text-sm">
                                  {item.Product.Name.charAt(0)}
                                </span>
                              </div>
                              )}
                              <span className="font-medium">
                                {item.Product.Name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700 border border-black text-center font-semibold"> ₱{item.Product.SellingPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 text-gray-700 border border-black text-center font-semibold">{item.Quantity}</td>
                          <td className="px-6 py-4 text-gray-700 border border-black text-center font-semibold">₱{item.Subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>

                </div>

                <div className="flex gap-6 my-6 px-8 justify-end text-m">
                    <div className="flex-shrink-0 space-y-2">
                      <p><strong>SUBTOTAL:</strong></p>
                      <p><strong>DISCOUNT:</strong></p>
                      <p><strong>VAT AMOUNT:</strong></p>
                      <p><strong>TOTAL:</strong></p>
                    </div>

                    <div className="flex-shrink-0 pl-4 space-y-2">
                      <p>₱{items.reduce((sum, item) => sum + (item.Product.SellingPrice*item.Quantity), 0).toFixed(2)}</p>
                      <p>₱{calculateTotalDiscount(items).toFixed(2)}</p>
                      <p>₱{selectedTransaction.VATAmount.toFixed(2)}</p>
                      <p><strong>₱{selectedTransaction.Total.toFixed(2)}</strong></p>
                    </div>
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
