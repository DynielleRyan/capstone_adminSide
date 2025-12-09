import api from "../services/api";

// 🧩 Your base URL (make sure this points to your backend)
const API_BASE = "/reports"; 

// ---------------- TYPES ----------------

// Daily transactions 
export interface DailyTransaction {
  day: string;
  dayName?: string;
  dayLabel?: string; // e.g., "Monday, Dec 9"
  totalTransactions: number;
  totalSales: number;
  totalUnitsSold: number;
  bestProduct?: string | null;
}

// Weekly transactions 
export interface WeeklyTransaction {
  week: string;
  weekLabel?: string; // e.g., "Dec W1"
  weekRange?: string; // e.g., "Dec 1 - Dec 7"
  weekTooltip?: string; // e.g., "Week 1 (Dec 1 - Dec 7)"
  totalTransactions: number;
  totalSales: number;
  totalUnitsSold: number;
  bestProduct?: string | null;
}

// Monthly transactions 
export interface MonthlyTransaction{
  month:string;
  totalTransactions:number;
  totalSales:number;
  totalUnitsSold:number;
  bestProduct?:string|null;
}
// Yearly transactions 
export interface YearlyTransaction {
  year: number;
  totalTransactions: number;
  totalSales: number;
  totalUnitsSold: number;
  bestProduct?: string | null;
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

// 1. Get daily transactions 
export const getDailyTransactions = async (
  days?: number
): Promise<DailyTransaction[]> => {
  const res = await api.get<{ from: string; to: string; series: DailyTransaction[] }>(
    `${API_BASE}/transac_daily`,
    { params: days ? { days } : {} }
  );
  return res.data.series ?? [];
};

// 2. Get weekly transactions 
export const getWeeklyTransactions = async (
  month?: number,
  year?: number
): Promise<WeeklyTransaction[]> => {
  const res = await api.get<{ month: number; year: number; series: WeeklyTransaction[] }>(
    `${API_BASE}/transac_weekly`,
    { params: { month, year } }
  );
  return res.data.series ?? [];
};

// 3. Get monthly transactions 
export const getMonthlyTransactions = async (
  year: number
): Promise<MonthlyTransaction[]> => {
  const res = await api.get<{ year: number; series: MonthlyTransaction[] }>(
    `${API_BASE}/transac_monthly`,
    { params: { year } }
  );

  return res.data.series; // backend returns { year, series: [...] }
};

// 4. Get yearly transactions 
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

// 5. Get top selling products or categories
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

// 6. Get reorder level / low stock items

export const getReorder = async (limit?: number): Promise<ReorderItem[]> => {
  const res = await api.get<ReorderItem[]>(`${API_BASE}/reorder`, {
    params: limit ? { limit } : {},   // will call .../reorder?limit=5
  });
  return res.data ?? [];
};
