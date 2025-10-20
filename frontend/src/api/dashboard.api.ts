// frontend/src/api/dashboard.api.ts
import axios from "axios";

const API_BASE = `${import.meta.env.VITE_API_BASE}/dashboard`; 

// ---- counts (top cards) ----
export async function getLowStockCount(threshold = 20) {
  const { data } = await axios.get(`${API_BASE}/lowstock`, {
    params: { threshold },
  });
  return data as { count: number; threshold: number };
}

export async function getExpiringCounts(warnMonths = 6, dangerMonths = 3) {
  const { data } = await axios.get(`${API_BASE}/expire`, {
    params: { warn_months: warnMonths, danger_months: dangerMonths },
  });
  return data as { total: number; warn: number; danger: number };
}

export async function getTransactionsCount(from?: string, to?: string) {
  const { data } = await axios.get(`${API_BASE}/transac_total`, {
    params: { from, to },
  });
  return data as { count: number; from: string; to: string };
}

export async function getTotalSales(from?: string, to?: string) {
  const { data } = await axios.get(`${API_BASE}/sales`, {
    params: { from, to },
  });
  return data as { totalSales: number; currency: string; from: string; to: string };
}

export async function getMonthlySales(from?: string, to?: string) {
  const { data } = await axios.get(`${API_BASE}/sales_month`, {
    params: { from, to },
  });
  return data as { year: number; data: { month: string; total: number; units: number }[] };
}

// ---- lists for the modals ----
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

export async function listLowStock(threshold = 20, limit = 100, offset = 0) {
  const { data } = await axios.get(`${API_BASE}/lowstock_list`, {
    params: { threshold, limit, offset },
  });
  return data as LowStockRow[];
}

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

export async function listExpiringBatches(months = 6, danger = 3, limit = 0, offset = 0) {
  const { data } = await axios.get(`${API_BASE}/expire_list`, {
    params: { months, danger, limit, offset },
  });
  return data as ExpiringRow[];
}
