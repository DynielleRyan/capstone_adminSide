import api from "../services/api";

// const API_BASE = `${import.meta.env.VITE_API_URL}/dashboard`;
// const API_BASE = import.meta.env.VITE_API_URL;
const API_BASE = "/dashboard"; 

// ---------- TYPES ----------
export interface LowStockCount {
  count: number;
  threshold: number;
}

export interface ExpiringCounts {
  total: number;
  warn: number;
  danger: number;
}

export interface TransactionsCount {
  count: number;
  from: string;
  to: string;
}

export interface TotalSales {
  totalSales: number;
  currency: string;
  from: string;
  to: string;
}

// Shared structure for all chart responses
export interface SalesPoint {
  day?: string;
  week?: string;
  month?: string;
  year?: number;
  total: number;
  units: number;
}

export interface SalesResponse {
  data: SalesPoint[];
}

// ---------- LOW STOCK TYPES ----------
export type LowStockRow = {
  rowNo: number;
  productId: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  expiry: string | null;
  qty: number;
  image: string | null;
};

export type ExpiringRow = {
  productItemId: string;
  productId: string;
  productName: string;
  category: string;
  brand: string;
  expiryDate: string;
  daysLeft: number;
  qty: number;
  expiryLevel: "warn" | "danger";
};

// ---------- API CALLS ----------

//  DASHBOARD METRICS
export async function getLowStockCount(threshold = 20): Promise<LowStockCount> {
  const { data } = await api.get<LowStockCount>(`${API_BASE}/lowstock`, {
    params: { threshold },
  });
  return data;
}

export async function getExpiringCounts(
  warnMonths = 6,
  dangerMonths = 3
): Promise<ExpiringCounts> {
  const { data } = await api.get<ExpiringCounts>(`${API_BASE}/expire`, {
    params: { warn_months: warnMonths, danger_months: dangerMonths },
  });
  return data;
}

export async function getTransactionsCount(
  from?: string,
  to?: string
): Promise<TransactionsCount> {
  const { data } = await api.get<TransactionsCount>(
    `${API_BASE}/transac_total`,
    { params: { from, to } }
  );
  return data;
}

export async function getTotalSales(
  from?: string,
  to?: string
): Promise<TotalSales> {
  const { data } = await api.get<TotalSales>(`${API_BASE}/sales`, {
    params: { from, to },
  });
  return data;
}

//  CHART DATA (Sales over time)
export async function getDailySales(days = 60) {
  const { data } = await api.get(`${API_BASE}/sales_day`, {
    params: { days },
  });
  return data;
}


export async function getWeeklySales(
  from?: string,
  to?: string
): Promise<SalesResponse> {
  const { data } = await api.get<SalesResponse>(`${API_BASE}/sales_week`, {
    params: { from, to },
  });
  return data;
}

export async function getMonthlySales(
  from?: string,
  to?: string
): Promise<SalesResponse> {
  const { data } = await api.get<SalesResponse>(`${API_BASE}/sales_month`, {
    params: { from, to },
  });
  return data;
}

export async function getYearlySales(
  from?: string,
  to?: string
): Promise<SalesResponse> {
  const { data } = await api.get<SalesResponse>(`${API_BASE}/sales_year`, {
    params: { from, to },
  });
  return data;
}

//  MODAL LISTS
export async function listLowStock(
  threshold = 20,
  limit = 100,
  offset = 0
): Promise<LowStockRow[]> {
  const { data } = await api.get<LowStockRow[]>(`${API_BASE}/lowstock_list`, {
    params: { threshold, limit, offset },
  });
  return data;
}

export async function listExpiringBatches(
  months = 6,
  danger = 3,
  limit = 0,
  offset = 0
): Promise<ExpiringRow[]> {
  const { data } = await api.get<ExpiringRow[]>(`${API_BASE}/expire_list`, {
    params: { months, danger, limit, offset },
  });
  return data;
}
