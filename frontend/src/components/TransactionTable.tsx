import { useState } from 'react';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';
import { fetchTransactionWithItems } from '../services/transactionService';

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

  return (
    <>
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Total</th>
            <th>User</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.TransactionID}>
              <td>{tx.TransactionID}</td>
              <td>{new Date(tx.OrderDateTime).toLocaleDateString()}</td>
              <td>₱{tx.Total.toFixed(2)}</td>
              <td>{tx.User.FirstName} {tx.User.LastName}</td>
              <td>
                <button className="btn btn-sm btn-outline" onClick={() => handleView(tx.TransactionID)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
              <ul className="list-disc pl-5 text-sm">
                {items.map((item, index) => (
                  <li key={item.TransactionItemID || index}>
                    {item.Product.Name} — {item.Quantity} × ₱{item.Product.SellingPrice.toFixed(2)}
                  </li>
                ))}
              </ul>
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
    </>
  );
};
