// src/hooks/report_hooks.ts
import { useEffect, useMemo, useState } from "react";
import {
  getMonthlyTransactions,
  getYearlyTransactions,
  getTopItems,
  getReorder, // now returns an array of low-stock items
  MonthlyTransaction,
  YearlyTransaction,
  TopItem,
  ReorderItem,
} from "../api/reports.api";

type ChartMode = "month" | "year";

/** tiny CSV helper */
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

export function report_hooks() {
  // ===== Chart controls =====
  const [mode, setMode] = useState<ChartMode>("month");
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(thisYear);
  const [fromYear] = useState<number>(thisYear - 4);
  const [toYear] = useState<number>(thisYear);

  // ===== Data =====
  const [chartMonthly, setChartMonthly] = useState<MonthlyTransaction[]>([]);
  const [chartYearly, setChartYearly] = useState<YearlyTransaction[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [reorder, setReorder] = useState<ReorderItem[]>([]); // LOW STOCK ONLY

  // ===== Top controls =====
  const [type, setType] = useState<"product" | "category">("product");
  const [limit, setLimit] = useState<number>(5);

  // ===== Loading flags =====
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingReorder, setLoadingReorder] = useState(false);
  
  

  // ----- transaction charts -----
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

  // ----- top items -----
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

   // ----- reorder level -----
      // to limit
   const [reorderLimit] = useState<number>(10); 

   const refetchReorder = async () => {
     setLoadingReorder(true);
     try {
       const rows = await getReorder(reorderLimit); // ⬅️ now allowed
       setReorder(rows || []);
     } finally {
       setLoadingReorder(false);
     }
   };

  useEffect(() => {
    refetchReorder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pick chart dataset
  const chartData = useMemo(
    () => (mode === "month" ? chartMonthly : chartYearly),
    [mode, chartMonthly, chartYearly]
  );

  // ===== CSV actions =====
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
          type === "product" ? it.name ?? "Unknown Product" : it.category ?? "Uncategorized",
        QuantitySold: it.sold,
      }))
    );
  };

  // const downloadReorderCSV = () => {
  //   downloadCSV(
  //     `low_stock.csv`,
  //     reorder.map((r) => ({
  //       Name: r.name,
  //       CurrentQty: r.totalStock,
  //       ReorderLevel: r.reorderLevel,
  //       Status: r.status,
  //     }))
  //   );
  // };
  const downloadReorderCSV = async () => {
    // fetch ALL for CSV regardless of current limit
    const all = await getReorder(); // no limit → backend returns every low-stock
    const rows = (all || []).map(r => ({
      Name: r.name,
      CurrentQty: r.totalStock,
      ReorderLevel: r.reorderLevel,
      SuggestedReorderQuantity: r.reorderQuantity,
    }));
    downloadCSV("low_stock.csv", rows);
  };
   // ===== Modals =====
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    reportType: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    reportType: "",
    onConfirm: () => {},
  });
  
  const openDownloadModal = (reportType: string, onConfirm: () => void) => {
    setModalState({
      isOpen: true,
      reportType,
      onConfirm,
    });
  };
  
  const closeModal = () => {
    setModalState({
      isOpen: false,
      reportType: "",
      onConfirm: () => {},
    });
  };
  return {
    // controls
    mode, setMode, thisYear, year, setYear, fromYear, toYear,
    type, setType, limit, setLimit,
    // data
    topItems, reorder, chartData,
    // loading
    loadingChart, loadingTop, loadingReorder,
    // actions
    downloadChartCSV, downloadTopCSV, downloadReorderCSV,
    refetchReorder,
      // modal controls
    modalState,
    openDownloadModal,
    closeModal,
  } as const;
}
