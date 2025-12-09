/* eslint-disable react/forbid-dom-props */
import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';
import { fetchTransactionWithItems, fetchTransactionQtyMap } from '../services/transactionService';
import { Search, Eye, ChevronLeft, ChevronRight, ArrowLeft, X } from 'lucide-react';

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
      "Clerk",
      "Total",
      "Payment Method",
      "VAT Amount",
      "Transaction Date",
      "Cash Received",
      "Payment Change",
      "Reference No.",
      "Quantity",
    ];

    // Prepare CSV data with all Transaction table fields
    const csvData = transactions.map((tx) => [
      tx.TransactionID,
      tx.User.FirstName + " " + tx.User.LastName,
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
      const refNo = String(tx.ReferenceNo).toLowerCase();
      

      return (
        txnId.includes(term) ||
        staffName.includes(term) ||
        payment.includes(term) ||
        date.includes(term) ||
        total.includes(term) ||
        refNo.includes(term)
      );
    });
  }

  // Sort function
  function sortTransactions(transactions: Transaction[],sortBy: string ): Transaction[] {
    const sorted = [...transactions];

    if (sortBy === 'none') {
      // Default sort by latest transaction date
      sorted.sort(
        (a, b) =>
          new Date(b.OrderDateTime).getTime() -
          new Date(a.OrderDateTime).getTime()
      );
    } else if (sortBy === "total-asc") {
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
    <div className="p-6 bg-gray-50 min-h-screen">
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
        <table className="w-full border-collapse">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">TXN ID</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">DATE ORDERED</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">STAFF</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">PAYMENT METHOD</th>
              <th className="px-4 py-4 text-center font-semibold border-r border-white">QTY</th>
              <th className="px-6 py-4 text-center font-semibold border-r border-white">TOTAL</th>
              <th className="px-6 py-4 text-center font-semibold">VIEW</th>
            </tr>
          </thead>
          <tbody className=" bg-blue-50">
            {paginatedData.map((tx => (
              <tr key={tx.TransactionID} >
                <td className="px-4 py-4 text-gray-700 text-center border border-white">{String(tx.TransactionID).padStart(2, '0')}</td>
                <td className="px-2 py-4 text-gray-700 text-center border border-white">
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
                <td className="px-4 py-4 text-gray-700 text-center border border-white">
                  <div className="font-medium">{tx.User.FirstName} {tx.User.LastName}</div>
                </td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">{tx.PaymentMethod}</td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">{qtyMap[tx.TransactionID] ?? 0}</td>
                <td className="px-4 py-4 text-gray-700 text-center border border-white">₱{tx.Total.toFixed(2)}</td>
                <td className="px-6 py-4 text-center border border-white">
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-200 text-gray-700 mx-auto" 
                    onClick={() => handleView(tx.TransactionID)}
                    title="View Transaction Details"
                  >
                    <Eye className="w-4 h-4" />
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

      {/* Transaction Modal - Receipt Style */}
      <dialog id="transaction_modal" className="modal">
        <div className="modal-box bg-white rounded-lg w-full max-w-5xl max-h-[90vh] p-0 text-black flex flex-col">
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
              {/* Close button in top right */}
              <div className="absolute top-4 right-4 z-10">
                <form method="dialog">
                  <button className="text-gray-500 hover:text-gray-700 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </form>
              </div>

              {/* Receipt Content - Scrollable */}
              <div className="px-6 py-6 space-y-4 overflow-y-auto flex-1">
                {/* Pharmacy Information */}
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold text-gray-900">Jambo's Pharmacy</h2>
                  <p className="text-sm text-gray-600">Babag, Lapu-Lapu City</p>
                  <p className="text-sm text-gray-600">0991 648 2809</p>
                </div>

                <hr className="border-gray-300" />

                {/* Transaction Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">Receipt No:</span>
                    <span>{selectedTransaction.ReferenceNo || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Transaction ID:</span>
                    <span className="text-xs font-mono">{selectedTransaction.TransactionID}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Date & Time:</span>
                    <span>
                      {new Date(selectedTransaction.OrderDateTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}, {new Date(selectedTransaction.OrderDateTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Payment Method:</span>
                    <span className="capitalize">{selectedTransaction.PaymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Staff:</span>
                    <span>{selectedTransaction.User.FirstName} {selectedTransaction.User.LastName}</span>
                  </div>
                </div>

                <hr className="border-gray-300" />

                {/* Itemized List */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Itemized List</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 font-semibold">Item</th>
                        <th className="text-center py-2 font-semibold">Qty</th>
                        <th className="text-right py-2 font-semibold">Price</th>
                        <th className="text-right py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const isVATExempt = item.Product.IsVATExemptYN || false;
                        const sellingPrice = item.Product.SellingPrice; // Base price
                        const vatAmountPerUnit = item.Product.VATAmount || 0; // VAT amount per unit
                        const shelfPricePerUnit = sellingPrice + vatAmountPerUnit; // Selling Price + VAT = Shelf Price
                        const itemSubtotal = item.Subtotal; // Total paid (after discounts if any)
                        
                        // Calculate unit price shown (shelf price per unit)
                        const unitPrice = shelfPricePerUnit;
                        // Calculate total VAT for this item
                        const totalVAT = vatAmountPerUnit * item.Quantity;
                        
                        return (
                          <tr key={item.TransactionItemID} className="border-b border-gray-200">
                            <td className="py-3">
                              <div className="space-y-1">
                                <div className="font-medium">{item.Product.Name}</div>
                                {isVATExempt ? (
                                  <div className="text-xs text-gray-500">VAT Exempt</div>
                                ) : (
                                  <div className="text-xs text-gray-500">VAT (12%): ₱{totalVAT.toFixed(2)}</div>
                                )}
                              </div>
                            </td>
                            <td className="text-center py-3">{item.Quantity}</td>
                            <td className="text-right py-3">₱{unitPrice.toFixed(2)}</td>
                            <td className="text-right py-3 font-medium">₱{itemSubtotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <hr className="border-gray-300" />

                {/* Summary Section */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">Subtotal:</span>
                    <span>₱{items.reduce((sum, item) => {
                      // Subtotal = Selling Price × Quantity (base price before VAT)
                      const sellingPrice = item.Product.SellingPrice;
                      return sum + (sellingPrice * item.Quantity);
                    }, 0).toFixed(2)}</span>
                  </div>
                  
                  {selectedTransaction.VATAmount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">VAT BREAKDOWN:</span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span>VAT (12%):</span>
                        <span>₱{selectedTransaction.VATAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {calculateTotalDiscount(items) > 0 && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Discount:</span>
                      <span>₱{calculateTotalDiscount(items).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <hr className="border-gray-300" />

                {/* Payment Information */}
                {selectedTransaction.PaymentMethod.toLowerCase() === 'cash' && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">Cash Received:</span>
                      <span>₱{selectedTransaction.CashReceived ? parseFloat(selectedTransaction.CashReceived).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Change:</span>
                      <span>₱{selectedTransaction.PaymentChange ? parseFloat(selectedTransaction.PaymentChange).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-400">
                  <span>TOTAL:</span>
                  <span>₱{selectedTransaction.Total.toFixed(2)}</span>
                </div>

                {/* Footer Messages */}
                <div className="text-center space-y-1 text-xs text-gray-600 pt-4">
                  <p>Thank you for your purchase!</p>
                  <p>Please keep this receipt for your records.</p>
                  <p>This is a computer-generated receipt.</p>
                </div>

                {/* Close Button at Bottom Right */}
                <div className="pt-4 flex justify-end">
                  <form method="dialog">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      Close
                    </button>
                  </form>
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