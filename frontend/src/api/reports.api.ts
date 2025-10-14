import axios from "axios";

// 🧩 Your base URL (make sure this points to your backend)
const API_BASE = "http://localhost:5001/api/reports"; // change port if needed

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
  reorderLevel: number;
  status: string;
}

// ---------------- API CALLS ----------------

// 📊 1️⃣ Get monthly transactions 
export const getMonthlyTransactions = async (
  year: number
): Promise<MonthlyTransaction[]> => {
  const res = await axios.get<{ year: number; series: MonthlyTransaction[] }>(
    `${API_BASE}/transac_monthly`,
    { params: { year } }
  );

  return res.data.series; // backend returns { year, series: [...] }
};

// 📊 1️⃣ Get yearly transactions 
export const getYearlyTransactions = async (
  from: number,
  to: number
): Promise<YearlyTransaction[]> => {
  const res = await axios.get<{ series: YearlyTransaction[] }>(
    `${API_BASE}/transac_yearly`,
    { params: { from, to } }
  );
  return res.data.series ?? [];
};

// 🏆 2️⃣ Get top selling products or categories
export const getTopItems = async (
  type: "product" | "category" = "product",
  limit: number = 5
): Promise<TopItem[]> => {
  const res = await axios.get<{ type: string; fromYear: number; toYear: number; limit: number; items: TopItem[] }>(
    `${API_BASE}/top_items`,
    { params: { type, limit } }
  );

  return res.data.items; // backend returns { type, fromYear, toYear, limit, items: [...] }
};

// ⚠️ 3️⃣ Get reorder level / low stock items
export const getReorder = async (): Promise<ReorderItem[]> => {
  const res = await axios.get<{ count: number; lowStock: ReorderItem[]; allProducts: ReorderItem[] }>(
    `${API_BASE}/reorder`
  );

  return res.data.lowStock; // backend returns { count, lowStock, allProducts }
};
