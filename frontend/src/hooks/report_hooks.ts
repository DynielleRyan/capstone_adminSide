// ===============================
//  Report Hooks
// ===============================
// This hook powers the Reports page:
// - Fetches transaction charts (monthly / yearly)
// - Loads top selling products / categories
// - Fetches reorder level data
// - Handles CSV exports and modal confirmation
// ===============================

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
} from "../types/reports.api";
import { toast } from "react-toastify";

type ChartMode = "month" | "year";

// ===============================
//  CSV DOWNLOAD HELPER
// ===============================
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

// ===============================
//  MAIN HOOK FUNCTION
// ===============================
export function report_hooks() {
  // -------- CONTROLS: Chart --------
  const [mode, setMode] = useState<ChartMode>("month");
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);
  const [fromYear] = useState<number>(thisYear - 4);
  const [toYear] = useState<number>(thisYear);

  // -------- STATE: Data --------
  const [chartMonthly, setChartMonthly] = useState<MonthlyTransaction[]>([]);
  const [chartYearly, setChartYearly] = useState<YearlyTransaction[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [reorder, setReorder] = useState<ReorderItem[]>([]);

  // -------- STATE: Top Selling --------
  const [type, setType] = useState<"product" | "category">("product");
  const [limit, setLimit] = useState<number>(5);

  // -------- STATE: Loading --------
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingReorder, setLoadingReorder] = useState(false);

  // ===============================
  //  FETCH: Chart (Monthly/Yearly)
  // ===============================
  useEffect(() => {
    const run = async () => {
      setLoadingChart(true);
      try {
        if (mode === "month") {
          setChartMonthly(await getMonthlyTransactions(year));
        } else {
          setChartYearly(await getYearlyTransactions(fromYear, toYear));
        }
      } finally {
        setLoadingChart(false);
      }
    };
    run();
  }, [mode, year, fromYear, toYear]);

  // ===============================
  //  FETCH: Top Selling Items
  // ===============================
  useEffect(() => {
    const run = async () => {
      setLoadingTop(true);
      try {
        setTopItems(await getTopItems(type, limit));
      } finally {
        setLoadingTop(false);
      }
    };
    run();
  }, [type, limit]);

  // ===============================
  // FETCH: Reorder Level Data
  // ===============================
  const refetchReorder = async () => {
    setLoadingReorder(true);
    try {
      setReorder(await getReorder()); // I limit it to none
    } finally {
      setLoadingReorder(false);
    }
  };

  useEffect(() => {
    refetchReorder();
  }, []);

  // ===============================
  //  COMPUTED: Choose Chart Dataset
  // ===============================
  const chartData = useMemo(
    () => (mode === "month" ? chartMonthly : chartYearly),
    [mode, chartMonthly, chartYearly]
  );

  // ===============================
  //  CSV EXPORT FUNCTIONS
  // ===============================
 const downloadChartCSV = () => {
  const data = mode === "month" ? chartMonthly : chartYearly;


  if (!data || data.length === 0) {
    toast.warning("No report available to download.");
    return;
  }

  if (mode === "month") {
    downloadCSV(
      `transactions_by_month_${year}.csv`,
      chartMonthly.map((r) => ({
        Month: r.month,
        TotalTransactions: r.totalTransactions,
        TotalSales: r.totalSales,
        TotalUnitsSold: r.totalUnitsSold,
        BestSellingProduct: r.bestProduct ?? "",
      }))
    );
  } else {
    downloadCSV(
      `transactions_by_year_${fromYear}-${toYear}.csv`,
      chartYearly.map((r) => ({
        Year: r.year,
        TotalTransactions: r.totalTransactions,
        TotalSales: r.totalSales,
        TotalUnitsSold: r.totalUnitsSold,
        BestSellingProduct: r.bestProduct ?? "",
      }))
    );
  }
};


  const downloadTopCSV = () => {
  if (!topItems || topItems.length === 0) {
    toast.warning("No report available to download.");
    return;
  }

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

  const downloadReorderCSV = async () => {
  const all = await getReorder();

  if (!all || all.length === 0) {
    toast.warning("No report available to download.");
    return;
  }

  const rows = all.map((r) => ({
    Name: r.name,
    CurrentQty: r.totalStock,
    ReorderLevel: r.reorderLevel,
    SuggestedReorderQuantity: r.reorderQuantity,
  }));

  downloadCSV("low_stock.csv", rows);
};

  // ===============================
  //  MODAL HANDLERS
  // ===============================
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    reportType: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    reportType: "",
    onConfirm: () => {},
  });

  const openDownloadModal = (reportType: string, onConfirm: () => void) =>
    setModalState({ isOpen: true, reportType, onConfirm });

  const closeModal = () =>
    setModalState({ isOpen: false, reportType: "", onConfirm: () => {} });

  // ===============================
  //  RETURN VALUES
  // ===============================
  return {
    // Controls
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
    // Data
    topItems,
    reorder,
    chartData,
    // Loading
    loadingChart,
    loadingTop,
    loadingReorder,
    // CSV Actions
    downloadChartCSV,
    downloadTopCSV,
    downloadReorderCSV,
    refetchReorder,
    // Modal
    modalState,
    openDownloadModal,
    closeModal,
  } as const;
}
