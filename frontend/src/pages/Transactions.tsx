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
      <h1 className="text-2xl font-bold mb-4">All Transactions</h1>
      <TransactionTable transactions={transactions} />
    </div>
  );
};
