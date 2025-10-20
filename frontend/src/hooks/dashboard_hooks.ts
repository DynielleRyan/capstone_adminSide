// frontend/src/hooks/dashboard_hooks.ts
import { useEffect, useMemo, useState } from "react";
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

// simple CSV helper
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function useDashboard() {
  // --- settings
  const threshold = 20;
  const warnMonths = 6;
  const dangerMonths = 3;

  // --- top cards
  const [lowCount, setLowCount] = useState<number>(0);
  const [expiringTotal, setExpiringTotal] = useState<number>(0);
  const [transactions, setTransactions] = useState<number>(0);

  // --- total sales
  const [totalSales, setTotalSales] = useState<number>(0);
  const currency = "₱"; // you can map from API if needed
  const [chartData, setChartData] = useState<{ month: string; total: number; units: number }[]>([]);

  // --- lists for modals
  const [lowRows, setLowRows] = useState<LowStockRow[]>([]);
  const [expRows, setExpRows] = useState<ExpiringRow[]>([]);

  // --- loading
  const [loading, setLoading] = useState(false);
  const [loadingLow, setLoadingLow] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);

  // --- modal state
  const [open, setOpen] = useState<null | "low" | "exp">(null);

  

  // initial fetch
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [{ count }, exp, tx, sales, monthly] = await Promise.all([
          getLowStockCount(threshold),
          getExpiringCounts(warnMonths, dangerMonths),
          getTransactionsCount(),
          getTotalSales(),
          getMonthlySales(),
        ]);
        setLowCount(count || 0);
        setExpiringTotal(exp.total || 0);
        setTransactions(tx.count || 0);
        setTotalSales(sales.totalSales || 0);
        setChartData(monthly.data || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // modal loaders
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

  // CSV
  function downloadLowCSV() {
    downloadCSV("low_on_stock.csv", lowRows.map(r => ({
      ID: r.rowNo,
      Product: r.name,
      Category: r.category,
      Brand: r.brand,
      Price: r.price,
      Expiry: r.expiry ?? "",
      Qty: r.qty,
    })));
  }
  function downloadExpCSV() {
    downloadCSV("expiring_batches.csv", expRows.map((r, i) => ({
      ID: i + 1,
      Product: r.productName,
      Category: r.category,
      Brand: r.brand,
      Expiry: r.expiryDate,
      DaysLeft: r.daysLeft,
      Qty: r.qty,
      Level: r.expiryLevel,
    })));
  }

//   // simple chart demo data (swap with your real series if you have one)
//   const chartData = useMemo(
//     () => [
//       { month: "Jan", units: 60, total: 2000 },
//       { month: "Feb", units: 100, total: 4000 },
//       { month: "Mar", units: 25, total: 1500 },
//       { month: "Apr", units: 105, total: 6500 },
//       { month: "May", units: 85, total: 5000 },
//       { month: "Jun", units: 150, total: 7000 },
//     ],
//     []
//   );

  return {
    // cards
    lowCount, expiringTotal, transactions, totalSales, currency, loading,
    // modals
    open, setOpen, openLowModal, openExpModal,
    // lists + flags
    lowRows, expRows, loadingLow, loadingExp,
    // csv
    downloadLowCSV, downloadExpCSV,
    // chart
    chartData,
  } as const;
}
