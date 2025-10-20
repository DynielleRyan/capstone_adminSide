// ===============================
// 🧭 Dashboard Hooks
// ===============================
// This hook handles the logic for the Dashboard page:
// - Fetches top metrics (low stock, expiring, transactions, total sales)
// - Loads and manages chart data for total sales
// - Opens and populates modals for Low Stock and Expiring products
// - Exports data to CSV
// ===============================

import { useEffect, useState } from "react";
import {
  getLowStockCount,
  getExpiringCounts,
  getTransactionsCount,
  getTotalSales,
  getMonthlySales,
  listLowStock,
  listExpiringBatches,
  LowStockRow,
  ExpiringRow,
} from "../api/dashboard.api";

// ===============================
// 📦 CSV DOWNLOAD HELPER
// ===============================
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","), // column headers
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ===============================
// ⚙️ MAIN HOOK FUNCTION
// ===============================
export function useDashboard() {
  // -------- CONFIG --------
  const threshold = 20; // qty threshold to mark as "low stock"
  const warnMonths = 6; // expiring warning threshold
  const dangerMonths = 3; // expiring danger threshold

  // -------- STATE: Top Cards --------
  const [lowCount, setLowCount] = useState(0);
  const [expiringTotal, setExpiringTotal] = useState(0);
  const [transactions, setTransactions] = useState(0);

  // -------- STATE: Sales / Chart --------
  const [totalSales, setTotalSales] = useState(0);
  const currency = "₱";
  const [chartData, setChartData] =
    useState<{ month: string; total: number; units: number }[]>([]);

  // -------- STATE: Modal Data --------
  const [lowRows, setLowRows] = useState<LowStockRow[]>([]);
  const [expRows, setExpRows] = useState<ExpiringRow[]>([]);

  // -------- STATE: Loading & Modal --------
  const [loading, setLoading] = useState(false);
  const [loadingLow, setLoadingLow] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [open, setOpen] = useState<null | "low" | "exp">(null);

  // ===============================
  // 🚀 INITIAL FETCH (RUN ON MOUNT)
  // ===============================
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        // fetch all data in parallel
        const [{ count }, exp, tx, sales, monthly] = await Promise.all([
          getLowStockCount(threshold),
          getExpiringCounts(warnMonths, dangerMonths),
          getTransactionsCount(),
          getTotalSales(),
          getMonthlySales(), // monthly already normalized in API layer
        ]);
        console.log("✅ Dashboard API results:", { count, exp, tx, sales, monthly });
        // update dashboard cards
        setLowCount(count || 0);
        setExpiringTotal(exp.total || 0);
        setTransactions(tx.count || 0);
        setTotalSales(sales.totalSales || 0);
        setChartData(
          Array.isArray((monthly as any)?.data)
            ? (monthly as any).data
            : Array.isArray(monthly as any)
              ? (monthly as any)
              : []
        );
        
      } catch (err) {
        console.error("❌ Dashboard API error:", err);
      }finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // ===============================
  // 📋 MODAL HANDLERS
  // ===============================

  // 🔹 Low Stock Modal
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

  // 🔸 Expiring Products Modal
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
  // 💾 CSV EXPORT FUNCTIONS
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
  // 🔄 RETURN VALUES
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
    // Modal data
    lowRows,
    expRows,
    loadingLow,
    loadingExp,
    // CSV
    downloadLowCSV,
    downloadExpCSV,
    // Chart
    chartData,
  } as const;
}
