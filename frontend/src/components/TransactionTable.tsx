/* eslint-disable react/forbid-dom-props */
import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';
import { fetchTransactionWithItems } from '../services/transactionService';
import { Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<Props> = ({ transactions }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('none');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
    

  const handleView = async (id: string) => {
    const result = await fetchTransactionWithItems(id);
    if (!result) {
      setErrorMessage('Transaction not found or failed to load.');
      setSelectedTransaction(null);
      setItems([]);
    } else {
      setSelectedTransaction(result.transaction);
      setItems(result.items);
      setErrorMessage(null);
    }

    const modal = document.getElementById('transaction_modal') as HTMLDialogElement;
    modal?.showModal();
  };

  const handleDownloadCSV = () => {
    // Prepare CSV headers for all Transaction table columns (excluding User table)
    const headers = [
      'TransactionID',
      'UserID',
      'Total',
      'PaymentMethod',
      'VATAmount',
      'OrderDateTime',
      'CashReceived',
      'PaymentChange',
      'ReferenceNo'
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
      tx.ReferenceNo
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔍 Search function
  function filterTransactions(transactions: Transaction[], searchTerm: string): Transaction[] {
    const term = searchTerm.toLowerCase();

    return transactions.filter((tx) => {
      const txnId = String(tx.TransactionID).toLowerCase();
      const staffName = `${tx.User.FirstName} ${tx.User.LastName}`.toLowerCase();
      const payment = String(tx.PaymentMethod).toLowerCase();; // static for now
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
  function sortTransactions(transactions: Transaction[], sortBy: string): Transaction[] {
    if (sortBy === 'none') return transactions;

    const sorted = [...transactions];

    if (sortBy === 'total-asc') {
      sorted.sort((a, b) => a.Total - b.Total);
    } else if (sortBy === 'total-desc') {
      sorted.sort((a, b) => b.Total - a.Total);
    } else if (sortBy === 'date-asc') {
      sorted.sort(
        (a, b) =>
          new Date(a.OrderDateTime).getTime() - new Date(b.OrderDateTime).getTime()
      );
    } else if (sortBy === 'date-desc') {
      sorted.sort(
        (a, b) =>
          new Date(b.OrderDateTime).getTime() - new Date(a.OrderDateTime).getTime()
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
            <label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Sort By:</label>
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
            className="bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded uppercase hover:bg-blue-600 transition-colors" 
            onClick={handleDownloadCSV}
            style={{ backgroundColor: '#3498db' }}
          >
            DOWNLOAD CSV
          </button>
          </div>
        </div>
      

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table w-full text-sm">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th>TXN ID</th>
              <th>DATE ORDERED</th>
              <th>STAFF</th>
              <th>PAYMENT METHOD</th>
              <th>QTY</th>
              <th>TOTAL</th>
              <th>VIEW</th>
            </tr>
          </thead>
          <tbody style={{ color: '#374151' }}>
            {paginatedData.map((tx, index) => (
              <tr key={tx.TransactionID} className="border-b">
                <td>
                  {String(tx.TransactionID).padStart(2, '0')}
                </td>
                <td>
                  <div>
                    {new Date(tx.OrderDateTime).toLocaleDateString('en-US', { 
                      month: 'numeric', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                    <br />
                    00:00:00
                  </div>
                </td>
                <td>
                  <div className="font-medium">{tx.User.FirstName} {tx.User.LastName}</div>
                </td>
                <td>{tx.PaymentMethod}</td>
                <td>
                  {Math.floor(Math.random() * 20) + 1}
                </td>
                <td>
                  P{tx.Total.toFixed(2)}
                </td>
                <td>
                  <button
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-100" 
                    style={{ color: '#374151' }}
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

      {/* DaisyUI Modal */}
      <dialog id="transaction_modal" className="modal">
        <div className="modal-box bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-black">
          {errorMessage ? (
            <div className="text-red-500 font-semibold">
              {errorMessage}
            </div>
          ) : selectedTransaction ? (
            <>
              <h3 className="font-bold text-lg mb-2">Transaction Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>ID:</strong> {selectedTransaction.TransactionID}</p>
                <p><strong>Date:</strong> {new Date(selectedTransaction.OrderDateTime).toLocaleString()}</p>
                <p><strong>Total:</strong> ₱{selectedTransaction.Total.toFixed(2)}</p>
                <p><strong>User:</strong> {selectedTransaction.User.FirstName} {selectedTransaction.User.LastName}</p>
              </div>

              <h4 className="mt-4 font-semibold">Items</h4>
              <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100 mb-8">
                <table className="table bg-white text-black">
                  <thead className=" text-black">
                  <tr>
                    <th >ITEM</th>
                    <th >PRICE</th>
                    <th >QUANTITY</th>
                    <th >SUBTOTAL</th>
                  </tr>
                  </thead>
                  <tbody>
                  {items.map((item) => (
                    <tr key={item.TransactionItemID} className="table-row">
                      <td className="table-cell item-name">{item.Product.Name}</td>
                      <td className="table-cell item-price">P{item.Product.SellingPrice.toFixed(2)}</td>
                      <td className="table-cell item-quantity">{item.Quantity}</td>              
                      <td className="table-cell subtotal-amount">P{item.Subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-sm text-right">
                <p><strong>SUBTOTAL:</strong> ₱{items.reduce((sum, item) => sum + item.Subtotal, 0).toFixed(2)}</p>
                <p><strong>DISCOUNT:</strong> ₱{selectedTransaction.Total.toFixed(2)}</p>
                <p><strong>VAT AMOUNT:</strong> ₱{selectedTransaction.VATAmount.toFixed(2)}</p>

                <p><strong>TOTAL:</strong> ₱{selectedTransaction.Total.toFixed(2)}</p>
              </div>
            </>
          ) : (
            <p className="text-sm">No transaction selected.</p>
          )}

          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
    </div>
  );
};
