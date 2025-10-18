import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';

interface Props {
  transaction: Transaction | null;
  items: TransactionItem[];
  errorMessage?: string | null;
  onClose: () => void;
}

export const TransactionModal: React.FC<Props> = ({ transaction, items, errorMessage, onClose }) => {
  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        {errorMessage ? (
          <div className="text-red-500 font-semibold">
            {errorMessage}
          </div>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-2">Transaction Details</h3>
            <div className="space-y-1 text-sm">
              <p><strong>ID:</strong> {transaction!.TransactionID}</p>
              <p><strong>Date:</strong> {new Date(transaction!.OrderDateTime).toLocaleString()}</p>
              <p><strong>Total:</strong> ₱{transaction!.Total.toFixed(2)}</p>
              <p><strong>User:</strong> {transaction!.User.FirstName} {transaction!.User.LastName}</p>
            </div>

            <h4 className="mt-4 font-semibold">Items</h4>
            <ul className="list-disc pl-5 text-sm">
              {items.map(item => (
                <li key={item.TransactionItemID}>
                  {item.Product.Name} — {item.Quantity} × ₱{item.Product.SellingPrice.toFixed(2)}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="modal-action">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </dialog>
  );
};
