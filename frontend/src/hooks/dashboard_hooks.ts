// ===============================
// 🧭 Dashboard Hooks
// ===============================
// Handles dashboard logic for:
// - Fetching top metrics (low stock, expiring, transactions, total sales)
// - Managing modals and CSV exports
// - Loading and caching chart data (daily, weekly, monthly, yearly)
// ===============================

import { useEffect, useState } from "react";
import {
  getLowStockCount,
  getExpiringCounts,
  getTransactionsCount,
  getTotalSales,
  getDailySales,    
  getWeeklySales,
  getMonthlySales,
  getYearlySales,
  listLowStock,
  listExpiringBatches,
  LowStockRow,
  ExpiringRow,
} from "../types/dashboard.api";

// ===============================
//  TYPES
// ===============================
export type ChartView = "day" | "week" | "month" | "year";

// ===============================
//  CSV DOWNLOAD HELPER
// ===============================
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","), // column headers
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ===============================
//  MAIN HOOK FUNCTION
// ===============================
export function useDashboard() {
  // -------- CONFIG --------
  const threshold = 20; // low stock threshold
  const warnMonths = 6; // expiring warning
  const dangerMonths = 3; // expiring danger

  // -------- STATE: Top Cards --------
  const [lowCount, setLowCount] = useState(0);
  const [expiringTotal, setExpiringTotal] = useState(0);
  const [transactions, setTransactions] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const currency = "₱";

  // -------- STATE: Chart --------
  const [chartView, setChartView] = useState<ChartView>("month");
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [seriesCache, setSeriesCache] = useState<Record<ChartView, any[]>>({
    day: [],
    week: [],
    month: [],
    year: [],
  });

  // -------- STATE: Modals --------
  const [lowRows, setLowRows] = useState<LowStockRow[]>([]);
  const [expRows, setExpRows] = useState<ExpiringRow[]>([]);
  const [open, setOpen] = useState<null | "low" | "exp">(null);
  const [loading, setLoading] = useState(false);
  const [loadingLow, setLoadingLow] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);

  // ===============================
  //  INITIAL FETCH (TOP CARDS)
  // ===============================
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [{ count }, exp, tx, sales] = await Promise.all([
          getLowStockCount(threshold),
          getExpiringCounts(warnMonths, dangerMonths),
          getTransactionsCount(),
          getTotalSales(),
        ]);

        setLowCount(count || 0);
        setExpiringTotal(exp.total || 0);
        setTransactions(tx.count || 0);
        setTotalSales(sales.totalSales || 0);
      } catch (err) {
        console.error("❌ Dashboard API error:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // ===============================
  //  CHART LOADER FUNCTION
  // ===============================
  const loadChart = async (view: ChartView) => {
    // Use cached data if available
    if (seriesCache[view]?.length) {
      setChartData(seriesCache[view]);
      return;
    }

    setChartLoading(true);
    try {
      let resp:any;
      switch (view) {
        case "day":
          resp = await getDailySales();
          break;
        case "week":
          resp = await getWeeklySales();
          break;
        case "month":
          resp = await getMonthlySales();
          break;
        case "year":
          resp = await getYearlySales();
          break;
        default:
          resp = await getMonthlySales();
      }

      const raw = Array.isArray(resp) ? resp : resp?.data ?? [];
      const points = raw.map((r: any) => ({
        label: r.day || r.week || r.month || r.year,
        total: r.total, // Number(r.total ? r.total.toFixed(2) : 0), // two decimal places
        units: r.units, // Number(r.units ? r.units.toFixed(2) : 0),
      }));

      // Cache and apply
      setSeriesCache((prev) => ({ ...prev, [view]: points }));
      setChartData(points);
    } catch (e) {
      console.error("chart load error", e);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  // Load monthly chart initially
  useEffect(() => {
    loadChart("month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load when view changes
  useEffect(() => {
    loadChart(chartView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartView]);

  // ===============================
  //  MODAL HANDLERS
  // ===============================
  async function openLowModal() {
    setOpen("low");
    setLoadingLow(true);
    try {
      const rows = await listLowStock(threshold, 200, 0);
      setLowRows(rows);
    } finally {
      setLoadingLow(false);
    }
  }

  async function openExpModal() {
    setOpen("exp");
    setLoadingExp(true);
    try {
      const rows = await listExpiringBatches(warnMonths, dangerMonths, 200, 0);
      setExpRows(rows);
    } finally {
      setLoadingExp(false);
    }
  }

  // ===============================
  //  CSV EXPORTS
  // ===============================
  function downloadLowCSV() {
    downloadCSV(
      "low_on_stock.csv",
      lowRows.map((r) => ({
        ID: r.rowNo,
        Product: r.name,
        Category: r.category,
        Brand: r.brand,
        Price: r.price,
        Expiry: r.expiry ?? "",
        Qty: r.qty,
      }))
    );
  }

  function downloadExpCSV() {
    downloadCSV(
      "expiring_batches.csv",
      expRows.map((r, i) => ({
        ID: i + 1,
        Product: r.productName,
        Category: r.category,
        Brand: r.brand,
        Expiry: r.expiryDate,
        DaysLeft: r.daysLeft,
        Qty: r.qty,
        Level: r.expiryLevel,
      }))
    );
  }

  // ===============================
  //  RETURN
  // ===============================
  return {
    // Cards
    lowCount,
    expiringTotal,
    transactions,
    totalSales,
    currency,
    loading,

    // Modals
    open,
    setOpen,
    openLowModal,
    openExpModal,
    lowRows,
    expRows,
    loadingLow,
    loadingExp,

    // CSV
    downloadLowCSV,
    downloadExpCSV,

    // Chart
    chartView,
    setChartView,
    chartData,
    chartLoading,
  } as const;
}
