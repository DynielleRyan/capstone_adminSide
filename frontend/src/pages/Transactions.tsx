import { useEffect, useState } from 'react';
import { Transaction } from '../types/transactions';
import { fetchTransactions } from '../services/transactionService';
import { TransactionTable } from '../components/TransactionTable';

export const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchTransactions().then(setTransactions);
  }, []);

  return (
    <div className="p-4">
      <TransactionTable transactions={transactions} />
    </div>
  );
};
