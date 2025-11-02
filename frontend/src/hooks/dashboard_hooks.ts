// ===============================
// 🧭 Dashboard Hooks
// ===============================
// - Fetches top metrics (low stock, expiring, transactions, total sales)
// - Optional: Preload lists for inline pages (no modals)
// - Also supports: Modal usage via openLowModal/openExpModal
// - Loads and caches chart data (day/week/month/year)
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

type UseDashboardOptions = {
  /** If true, loads lowRows and expRows on mount for inline pages */
  preloadLists?: boolean;
};

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
export function useDashboard(opts: UseDashboardOptions = {}) {
  const { preloadLists = false } = opts;

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
  const [loading, setLoading] = useState(false);

  // -------- STATE: Lists (inline + modal share same data) --------
  const [lowRows, setLowRows] = useState<LowStockRow[]>([]);
  const [expRows, setExpRows] = useState<ExpiringRow[]>([]);
  const [loadingLow, setLoadingLow] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);

  // -------- STATE: Modals (kept for other pages) --------
  const [open, setOpen] = useState<null | "low" | "exp">(null);

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

        setLowCount(Number(count) || 0);
        setExpiringTotal(Number(exp?.total) || 0);
        setTransactions(Number(tx?.count) || 0);
        setTotalSales(Number(sales?.totalSales) || 0);
      } catch (err) {
        console.error("❌ Dashboard API error:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===============================
  //  LIST LOADERS (shared by inline + modal)
  // ===============================
  const loadLowRows = async () => {
    setLoadingLow(true);
    try {
      const rows = await listLowStock(threshold, 200, 0);
      setLowRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("loadLowRows error", e);
      setLowRows([]);
    } finally {
      setLoadingLow(false);
    }
  };

  const loadExpRows = async () => {
    setLoadingExp(true);
    try {
      const rows = await listExpiringBatches(warnMonths, dangerMonths, 200, 0);
      setExpRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("loadExpRows error", e);
      setExpRows([]);
    } finally {
      setLoadingExp(false);
    }
  };

  // Optional preload for inline pages
  useEffect(() => {
    if (preloadLists) {
      loadLowRows();
      loadExpRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadLists]);

  // Modal open handlers (reuse loaders)
  async function openLowModal() {
    setOpen("low");
    await loadLowRows();
  }

  async function openExpModal() {
    setOpen("exp");
    await loadExpRows();
  }

  // Manual refresh (works in either mode)
  const refreshLists = async () => {
    await Promise.all([loadLowRows(), loadExpRows()]);
  };

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
      let resp: any;
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
        total: r.total,
        units: r.units,
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
        Price: Number(r.price ?? 0).toFixed(2),
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

    // Lists (inline or modal)
    lowRows,
    expRows,
    loadingLow,
    loadingExp,
    refreshLists,

    // Modals (for other pages)
    open,
    setOpen,
    openLowModal,
    openExpModal,

    // Chart
    chartView,
    setChartView,
    chartData,
    chartLoading,

    // CSV
    downloadLowCSV,
    downloadExpCSV,
  } as const;
}
