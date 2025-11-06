import api from './api';
import { Transaction } from '../types/transactions';
import { TransactionItem } from '../types/transactionItems';

export interface TransactionWithItems  {
  transaction: Transaction;
  items: TransactionItem[];
}

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get('/transactions');
  return response.data;
};

export const fetchTransactionWithItems = async (id: string): Promise<TransactionWithItems | null> => {
  try {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    return null;
  }
};  

export const fetchTransactionQtyMap = async (ids?: string[]) => {
  const qs = ids?.length ? `?ids=${ids.join(',')}` : '';
  const { data } = await api.get<Record<string, number>>(`/transactions/quantities${qs}`);
  return data;
};