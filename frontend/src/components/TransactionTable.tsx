/* eslint-disable react/forbid-dom-props */
import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';
import { fetchTransactionWithItems, fetchTransactionQtyMap } from '../services/transactionService';
import { Search, Eye, ChevronLeft, ChevronRight, X, Copy, Check } from 'lucide-react';
import { toast } from 'react-toastify';

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
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [previewData, setPreviewData] = useState<{
    transactions: Transaction[];
    filename: string;
  } | null>(null);
  const [transactionItemsMap, setTransactionItemsMap] = useState<Map<string, TransactionItem[]>>(new Map());
  const [loadingItems, setLoadingItems] = useState(false);
  const [copiedTransactionIDs, setCopiedTransactionIDs] = useState<Set<string>>(new Set());

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

  // Copy transaction ID to clipboard
  const copyTransactionID = async (transactionID: string) => {
    try {
      await navigator.clipboard.writeText(transactionID);
      setCopiedTransactionIDs(prev => new Set(prev).add(transactionID));
      setTimeout(() => {
        setCopiedTransactionIDs(prev => {
          const next = new Set(prev);
          next.delete(transactionID);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get unique staff members and payment methods from transactions
  const uniqueStaff = useMemo(() => {
    const staffMap = new Map<string, string>();
    transactions.forEach(tx => {
      const staffId = tx.UserID;
      const staffName = `${tx.User.FirstName} ${tx.User.LastName}`;
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, staffName);
      }
    });
    return Array.from(staffMap.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions]);

  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set<string>();
    transactions.forEach(tx => {
      if (tx.PaymentMethod) {
        methods.add(tx.PaymentMethod);
      }
    });
    return Array.from(methods).sort();
  }, [transactions]);

  // Filter transactions based on selected filters
  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Filter by staff
    if (selectedStaff !== "all") {
      filtered = filtered.filter(tx => tx.UserID === selectedStaff);
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter(tx => {
        const txnDate = new Date(tx.OrderDateTime);
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return txnDate >= start && txnDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          return txnDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return txnDate <= end;
        }
        return true;
      });
    }

    // Filter by payment method
    if (selectedPaymentMethod !== "all") {
      filtered = filtered.filter(tx => tx.PaymentMethod === selectedPaymentMethod);
    }

    return filtered;
  };

  // Fetch transaction items for discount calculation
  const fetchTransactionItems = async (transactionIds: string[]) => {
    setLoadingItems(true);
    const itemsMap = new Map<string, TransactionItem[]>();
    
    try {
      // Fetch items for all transactions in parallel
      const itemPromises = transactionIds.map(async (id) => {
        try {
          const result = await fetchTransactionWithItems(id);
          if (result && result.items) {
            itemsMap.set(id, result.items);
          }
        } catch (error) {
          console.error(`Failed to fetch items for transaction ${id}:`, error);
        }
      });
      
      await Promise.all(itemPromises);
      setTransactionItemsMap(itemsMap);
    } catch (error) {
      console.error("Error fetching transaction items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  // Show preview instead of downloading immediately
  const handleDownloadCSV = async () => {
    const filteredTransactions = getFilteredTransactions();

    if (filteredTransactions.length === 0) {
      toast.warning("No transactions match the selected filters.");
      return;
    }

    // Fetch transaction items for discount calculation
    toast.info("Loading transaction details...");
    const transactionIds = filteredTransactions.map(tx => tx.TransactionID);
    await fetchTransactionItems(transactionIds);

    // Create filename with filter info
    let filename = `transactions_${new Date().toISOString().split("T")[0]}`;
    if (selectedStaff !== "all") {
      const staffName = uniqueStaff.find(s => s.id === selectedStaff)?.name || "";
      filename += `_${staffName.replace(/\s+/g, '_')}`;
    }
    if (startDate || endDate) {
      filename += `_${startDate || 'start'}_to_${endDate || 'end'}`;
    }
    if (selectedPaymentMethod !== "all") {
      filename += `_${selectedPaymentMethod.replace(/\s+/g, '_')}`;
    }
    filename += ".csv";

    setPreviewData({
      transactions: filteredTransactions,
      filename,
    });
    setFilterModalOpen(false);
    setPreviewModalOpen(true);
  };

  // Actually download the CSV
  const confirmDownloadCSV = () => {
    if (!previewData || previewData.transactions.length === 0) {
      toast.warning("No transactions to download.");
      return;
    }

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
      "PWD/Senior Accredited",
      "PWD/Senior ID",
      "Total Discount",
    ];

    // Prepare CSV data with all Transaction table fields
    const csvData = previewData.transactions.map((tx) => {
      const items = transactionItemsMap.get(tx.TransactionID) || [];
      const totalDiscount = calculateTotalDiscount(items);
      const isPWDSenior = tx.SeniorPWDID ? "Yes" : "No";
      
      return [
        tx.TransactionID,
        tx.User.FirstName + " " + tx.User.LastName,
        `₱${tx.Total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        tx.PaymentMethod,
        `₱${(tx.VATAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        tx.OrderDateTime,
        tx.CashReceived ? `₱${parseFloat(tx.CashReceived).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "",
        tx.PaymentChange ? `₱${parseFloat(tx.PaymentChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "",
        tx.ReferenceNo,
        qtyMap[tx.TransactionID] ?? 0,
        isPWDSenior,
        tx.SeniorPWDID || "",
        `₱${totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ];
    });

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", previewData.filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloaded ${previewData.transactions.length} transaction(s)`);
    setPreviewModalOpen(false);
    setPreviewData(null);
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
            onClick={() => setFilterModalOpen(true)}
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
                <td className="px-4 py-4 text-gray-700 text-center border border-white">
                  <div className="flex items-center justify-center gap-2">
                    <span>{String(tx.TransactionID).padStart(2, '0')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyTransactionID(tx.TransactionID);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Copy Transaction ID"
                    >
                      {copiedTransactionIDs.has(tx.TransactionID) ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-600 hover:text-blue-600" />
                      )}
                    </button>
                  </div>
                </td>
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
                  <div className="flex justify-between">
                    <span className="font-semibold">PWD/Senior Accredited:</span>
                    <span className={selectedTransaction.SeniorPWDID ? "text-green-600 font-medium" : "text-gray-600"}>
                      {selectedTransaction.SeniorPWDID ? "Yes" : "No"}
                    </span>
                  </div>
                  {selectedTransaction.SeniorPWDID && (
                    <div className="flex justify-between">
                      <span className="font-semibold">PWD/Senior ID:</span>
                      <span className="text-xs font-mono">{selectedTransaction.SeniorPWDID}</span>
                    </div>
                  )}
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

      {/* CSV Download Filter Modal */}
      {filterModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Download CSV with Filters
              </h3>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Member
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                >
                  <option value="all">All Staff</option>
                  {uniqueStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Date Range
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      min={startDate || undefined}
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear dates
                  </button>
                )}
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                >
                  <option value="all">All Payment Methods</option>
                  {uniquePaymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview count */}
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{getFilteredTransactions().length}</span> transaction(s) will be downloaded
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => {
                    setFilterModalOpen(false);
                    setSelectedStaff("all");
                    setStartDate("");
                    setEndDate("");
                    setSelectedPaymentMethod("all");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                  onClick={handleDownloadCSV}
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-[95vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Transaction CSV Preview
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewData.filename} ({previewData.transactions.length} transactions)
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewData(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 min-h-0">
              {loadingItems ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">Loading transaction details...</div>
                </div>
              ) : previewData.transactions.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">No transactions to preview</div>
                </div>
              ) : (
                <div className="preview-scroll-container overflow-x-auto overflow-y-auto h-full">
                  <table className="table table-zebra w-full text-sm min-w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Transaction ID</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Clerk</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Total</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Payment Method</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">VAT Amount</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Transaction Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Reference No.</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Quantity</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">PWD/Senior Accredited</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">PWD/Senior ID</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Total Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.transactions.slice(0, 50).map((tx) => {
                        const items = transactionItemsMap.get(tx.TransactionID) || [];
                        const totalDiscount = calculateTotalDiscount(items);
                        const isPWDSenior = tx.SeniorPWDID ? "Yes" : "No";
                        
                        return (
                          <tr key={tx.TransactionID} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">{tx.TransactionID}</td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">
                              {tx.User.FirstName} {tx.User.LastName}
                            </td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">
                              ₱{tx.Total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">{tx.PaymentMethod}</td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">
                              ₱{(tx.VATAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">
                              {new Date(tx.OrderDateTime).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">{tx.ReferenceNo || ""}</td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">{qtyMap[tx.TransactionID] ?? 0}</td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">{isPWDSenior}</td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">{tx.SeniorPWDID || ""}</td>
                            <td className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">
                              ₱{totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {previewData.transactions.length > 50 && (
                    <div className="mt-4 text-center text-sm text-gray-500">
                      Showing first 50 of {previewData.transactions.length} transactions. Full data will be included in download.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                onClick={() => {
                  setPreviewModalOpen(false);
                  setPreviewData(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={confirmDownloadCSV}
                disabled={!previewData || previewData.transactions.length === 0 || loadingItems}
              >
                {loadingItems ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};