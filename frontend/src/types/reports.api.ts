import api from "../services/api";

const API_BASE = `${import.meta.env.VITE_API_URL}/reports`; 
// const API_BASE = import.meta.env.VITE_API_URL;

// ---------------- TYPES ----------------

// Monthly transactions 
export interface MonthlyTransaction {
  month: string;
  totalTransactions: number;
}
// Yearly transactions 
export interface YearlyTransaction{
  year: number;
  totalTransactions: number;
}

// Top items (products or categories)
export interface TopItem {
  productId?: string;
  name: string;
  category?: string | null;
  sold: number;
}

// Reorder level (low stock)
export interface ReorderItem {
  productId: string;
  name: string;
  totalStock: number;
  avgDailyUsage?: number;  // optional, controller sends it
  leadTimeDays?: number;   // optional
  safetyStock?: number;    // optional
  reorderQuantity?: number; 
  reorderLevel: number;
  status: "LOW STOCK" | "OK";
}


// ---------------- API CALLS ----------------

// 1. Get monthly transactions 
export const getMonthlyTransactions = async (
  year: number
): Promise<MonthlyTransaction[]> => {
  const res = await api.get<{ year: number; series: MonthlyTransaction[] }>(
    `${API_BASE}/transac_monthly`,
    { params: { year } }
  );

  return res.data.series; // backend returns { year, series: [...] }
};

// 2. Get yearly transactions 
export const getYearlyTransactions = async (
  from: number,
  to: number
): Promise<YearlyTransaction[]> => {
  const res = await api.get<{ series: YearlyTransaction[] }>(
    `${API_BASE}/transac_yearly`,
    { params: { from, to } }
  );
  return res.data.series ?? [];
};

// 3. Get top selling products or categories
export const getTopItems = async (
  type: "product" | "category" = "product",
  limit: number = 5
): Promise<TopItem[]> => {
  const res = await api.get<{ type: string; fromYear: number; toYear: number; limit: number; items: TopItem[] }>(
    `${API_BASE}/top_items`,
    { params: { type, limit } }
  );

  return res.data.items; // backend returns { type, fromYear, toYear, limit, items: [...] }
};

// // 4. Get reorder level / low stock items

export const getReorder = async (limit?: number): Promise<ReorderItem[]> => {
  const res = await api.get<ReorderItem[]>(`${API_BASE}/reorder`, {
    params: limit ? { limit } : {},   // will call .../reorder?limit=5
  });
  return res.data ?? [];
};
