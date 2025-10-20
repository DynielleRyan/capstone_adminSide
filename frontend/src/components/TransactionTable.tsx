/* eslint-disable react/forbid-dom-props */
import { useState } from 'react';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';
import { fetchTransactionWithItems } from '../services/transactionService';
import { Eye } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<Props> = ({ transactions }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


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

  return (
    <div className="bg-white min-h-screen p-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold uppercase m-0" style={{ color: '#145DA0' }}>TRANSACTION</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm" style={{ color: '#145DA0' }}>Sort By</label>
            <select 
              className="px-3 py-2 border rounded bg-white text-sm min-w-[120px] focus:outline-none" 
              style={{ 
                borderColor: '#d1d5db', 
                color: '#145DA0',
                fontSize: '14px'
              }}
              title="Sort transactions"
            >
              <option>None</option>
              <option>Date</option>
              <option>Total</option>
              <option>Staff</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm" style={{ color: '#145DA0' }}>Search</label>
            <input 
              className="px-3 py-2 border rounded bg-white text-sm min-w-[200px] focus:outline-none" 
              style={{ 
                borderColor: '#d1d5db', 
                color: '#145DA0',
                fontSize: '14px'
              }}
              placeholder="None" 
            />
          </div>
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
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th 
                className="text-white font-bold text-sm text-center px-4 py-3 border" 
                style={{ 
                  backgroundColor: '#3498db', 
                  borderColor: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                TXN ID
              </th>
              <th 
                className="text-white font-bold text-sm text-center px-4 py-3 border" 
                style={{ 
                  backgroundColor: '#3498db', 
                  borderColor: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                DATE ORDERED
              </th>
              <th 
                className="text-white font-bold text-sm text-center px-4 py-3 border" 
                style={{ 
                  backgroundColor: '#3498db', 
                  borderColor: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                STAFF
              </th>
              <th 
                className="text-white font-bold text-sm text-center px-4 py-3 border" 
                style={{ 
                  backgroundColor: '#3498db', 
                  borderColor: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                PAYMENT
              </th>
              <th 
                className="text-white font-bold text-sm text-center px-4 py-3 border" 
                style={{ 
                  backgroundColor: '#3498db', 
                  borderColor: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                QTY
              </th>
              <th 
                className="text-white font-bold text-sm text-center px-4 py-3 border" 
                style={{ 
                  backgroundColor: '#3498db', 
                  borderColor: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                TOTAL
              </th>
              <th 
                className="text-white font-bold text-sm text-center px-4 py-3 border" 
                style={{ 
                  backgroundColor: '#3498db', 
                  borderColor: '#e5e7eb',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                VIEW
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr key={tx.TransactionID} className="border-b" style={{ backgroundColor: '#e0f2f7', borderColor: '#e5e7eb' }}>
                <td 
                  className="px-4 py-3 border text-sm font-semibold text-center" 
                  style={{ 
                    borderColor: '#e5e7eb',
                    color: '#145DA0',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td 
                  className="px-4 py-3 border text-center" 
                  style={{ 
                    borderColor: '#e5e7eb',
                    color: '#374151',
                    fontSize: '13px'
                  }}
                >
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
                <td 
                  className="px-4 py-3 border text-center" 
                  style={{ 
                    borderColor: '#e5e7eb',
                    color: '#374151',
                    fontSize: '14px'
                  }}
                >
                  <div className="font-medium" style={{ color: '#374151' }}>Ms. {tx.User.FirstName}</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>{tx.User.LastName}</div>
                </td>
                <td 
                  className="px-4 py-3 border text-center" 
                  style={{ 
                    borderColor: '#e5e7eb',
                    fontSize: '14px'
                  }}
                >
                  <span 
                    className="px-2 py-1 rounded text-xs font-semibold uppercase" 
                    style={{ 
                      backgroundColor: '#f3f4f6',
                      color: '#145DA0',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    CASH
                  </span>
                </td>
                <td 
                  className="px-4 py-3 border text-center text-sm font-semibold" 
                  style={{ 
                    borderColor: '#e5e7eb',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {Math.floor(Math.random() * 20) + 1}
                </td>
                <td 
                  className="px-4 py-3 border text-center text-sm font-semibold" 
                  style={{ 
                    borderColor: '#e5e7eb',
                    color: '#145DA0',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  P{tx.Total.toFixed(2)}
                </td>
                <td 
                  className="px-4 py-3 border text-center" 
                  style={{ 
                    borderColor: '#e5e7eb',
                    fontSize: '14px'
                  }}
                >
                  <button 
                    className="bg-transparent border-none cursor-pointer p-2 rounded flex items-center justify-center hover:bg-gray-100" 
                    style={{ color: '#145DA0' }}
                    onClick={() => handleView(tx.TransactionID)}
                    title="View transaction details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <button 
          className="bg-white border px-3 py-2 rounded text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
          style={{ 
            borderColor: '#d1d5db',
            color: '#6b7280',
            fontSize: '14px'
          }}
          disabled
        >
          &lt;
        </button>
        <button 
          className="text-white border px-3 py-2 rounded text-sm cursor-pointer" 
          style={{ 
            backgroundColor: '#e0f2f7',
            borderColor: '#e0f2f7',
            color: '#145DA0',
            fontSize: '14px'
          }}
        >
          1
        </button>
        <button 
          className="bg-white border px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-50" 
          style={{ 
            borderColor: '#d1d5db',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          2
        </button>
        <button 
          className="bg-white border px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-50" 
          style={{ 
            borderColor: '#d1d5db',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          3
        </button>
        <button 
          className="bg-white border px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-50" 
          style={{ 
            borderColor: '#d1d5db',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          &gt;
        </button>
      </div>

      {/* DaisyUI Modal */}
      <dialog id="transaction_modal" className="modal">
        <div className="modal-box">
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
              <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
                <table className="table">
        <thead>
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

              <div className="space-y-1 text-sm">
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
  );
};
