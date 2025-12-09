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

export interface DetailedTransactionReport {
  transactions: Transaction[];
  items: TransactionItem[];
  period: {
    type: string;
    start: string;
    end: string;
  };
}

export interface ReportParams {
  periodType: 'day' | 'week' | 'month' | 'year';
  date?: string; // YYYY-MM-DD for day
  week?: number; // 1-5 for week
  month?: number; // 1-12 for month/week
  year?: number; // YYYY for year/month/week
}

export const fetchDetailedTransactionsForReport = async (params: ReportParams): Promise<DetailedTransactionReport> => {
  const queryParams = new URLSearchParams();
  queryParams.append('periodType', params.periodType);
  
  if (params.date) queryParams.append('date', params.date);
  if (params.week) queryParams.append('week', params.week.toString());
  if (params.month) queryParams.append('month', params.month.toString());
  if (params.year) queryParams.append('year', params.year.toString());
  
  const response = await api.get<DetailedTransactionReport>(`/transactions/report?${queryParams.toString()}`);
  return response.data;
};