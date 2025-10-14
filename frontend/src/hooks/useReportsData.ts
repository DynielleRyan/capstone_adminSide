import { useEffect, useMemo, useState } from "react";
import {
  getMonthlyTransactions,
  getYearlyTransactions,
  getTopItems,
  getReorder,
  MonthlyTransaction,
  YearlyTransaction,
  TopItem,
  ReorderItem,
} from "../api/reports.api";

type ChartMode = "month" | "year";

// demo
// type DemoLow = {
//   productId: string;
//   name: string;
//   totalStock: number;
//   reorderLevel: number;
//   status: "LOW STOCK";
// };

/** quick CSV download helper (scoped to this hook) */
function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function useReportsData() {
  // --- chart controls
  const [mode, setMode] = useState<ChartMode>("month");
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear); // used when mode === "month"
  const [fromYear] = useState<number>(thisYear - 4); // used when mode === "year"
  const [toYear] = useState<number>(thisYear);

  // --- data states
  const [chartMonthly, setChartMonthly] = useState<MonthlyTransaction[]>([]);
  const [chartYearly, setChartYearly] = useState<YearlyTransaction[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [reorder, setReorder] = useState<ReorderItem[]>([]);

  // --- top items controls
  const [type, setType] = useState<"product" | "category">("product");
  const [limit, setLimit] = useState<number>(5);

  // --- loading flags (super simple)
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingReorder, setLoadingReorder] = useState(false);

  // fetch chart data when mode/year change
  useEffect(() => {
    const run = async () => {
      setLoadingChart(true);
      try {
        if (mode === "month") {
          const rows = await getMonthlyTransactions(year);
          setChartMonthly(rows || []);
        } else {
          const rows = await getYearlyTransactions(fromYear, toYear);
          setChartYearly(rows || []);
        }
      } finally {
        setLoadingChart(false);
      }
    };
    run();
  }, [mode, year, fromYear, toYear]);

  // fetch top items when controls change
  useEffect(() => {
    const run = async () => {
      setLoadingTop(true);
      try {
        const rows = await getTopItems(type, limit);
        setTopItems(rows || []);
      } finally {
        setLoadingTop(false);
      }
    };
    run();
  }, [type, limit]);

  // fetch reorder once
  useEffect(() => {
    const run = async () => {
      setLoadingReorder(true);
      try {
        const rows = await getReorder();
        setReorder(rows || []);
      } finally {
        setLoadingReorder(false);
      }
    };
    run();
  }, []);

  // choose which chart data to render
  const chartData = useMemo(
    () => (mode === "month" ? chartMonthly : chartYearly),
    [mode, chartMonthly, chartYearly]
  );

  // CSV actions
  const downloadChartCSV = () => {
    if (mode === "month") {
      downloadCSV(
        `transactions_by_month_${year}.csv`,
        (chartMonthly || []).map((r) => ({
          Month: r.month,
          TotalTransactions: r.totalTransactions,
        }))
      );
    } else {
      downloadCSV(
        `transactions_by_year_${fromYear}-${toYear}.csv`,
        (chartYearly || []).map((r) => ({
          Year: r.year,
          TotalTransactions: r.totalTransactions,
        }))
      );
    }
  };

  const downloadTopCSV = () => {
    downloadCSV(
      `top_${type}_${limit}.csv`,
      topItems.map((it, i) => ({
        Rank: i + 1,
        [type === "product" ? "Product" : "Category"]:
          type === "product"
            ? it.name ?? "Unknown Product"
            : it.category ?? "Uncategorized",
        QuantitySold: it.sold,
      }))
    );
  };

  const downloadReorderCSV = () => {
    downloadCSV(
      `reorder_level_low_stock.csv`,
      (reorder || []).map((r) => ({
        Name: r.name,
        CurrentQty: r.totalStock,
        ReorderLevel: r.reorderLevel,
        Status: r.status,
      }))
    );
  };

  return {
    // controls
    mode,
    setMode,
    thisYear,
    year,
    setYear,
    fromYear,
    toYear,
    type,
    setType,
    limit,
    setLimit,
    // data
    chartMonthly,
    chartYearly,
    topItems,
    reorder,
    chartData,
    // loading flags
    loadingChart,
    loadingTop,
    loadingReorder,
    // actions
    downloadChartCSV,
    downloadTopCSV,
    downloadReorderCSV,
  } as const;
}


