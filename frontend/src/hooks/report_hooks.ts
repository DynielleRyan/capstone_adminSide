// ===============================
//  Report Hooks
// ===============================
// This hook powers the Reports page:
// - Fetches transaction charts (daily / weekly / monthly / yearly)
// - Loads top selling products / categories
// - Fetches reorder level data
// - Handles CSV exports and modal confirmation
// ===============================

import { useEffect, useMemo, useState } from "react";
import {
  getDailyTransactions,
  getWeeklyTransactions,
  getMonthlyTransactions,
  getYearlyTransactions,
  getTopItems,
  getReorder,
  DailyTransaction,
  WeeklyTransaction,
  MonthlyTransaction,
  YearlyTransaction,
  TopItem,
  ReorderItem,
} from "../types/reports.api";
import { toast } from "react-toastify";
import { fetchDetailedTransactionsForReport, ReportParams, DetailedTransactionReport } from "../services/transactionService";
import { Transaction } from "../types/transactions";
import { TransactionItem } from "../types/transactionItems";

type ChartMode = "day" | "week" | "month" | "year";

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
  const [chartDaily, setChartDaily] = useState<DailyTransaction[]>([]);
  const [chartWeekly, setChartWeekly] = useState<WeeklyTransaction[]>([]);
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
  //  FETCH: Chart (Daily/Weekly/Monthly/Yearly)
  // ===============================
  useEffect(() => {
    const run = async () => {
      setLoadingChart(true);
      try {
        if (mode === "day") {
          setChartDaily(await getDailyTransactions(60));
        } else if (mode === "week") {
          const now = new Date();
          setChartWeekly(await getWeeklyTransactions(now.getMonth(), now.getFullYear()));
        } else if (mode === "month") {
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
  const chartData = useMemo(() => {
    if (mode === "day") return chartDaily;
    if (mode === "week") return chartWeekly;
    if (mode === "month") return chartMonthly;
    return chartYearly;
  }, [mode, chartDaily, chartWeekly, chartMonthly, chartYearly]);

  // ===============================
  //  CSV EXPORT FUNCTIONS
  // ===============================
 const downloadChartCSV = () => {
  let data: any[] = [];
  let filename = "";

  if (mode === "day") {
    data = chartDaily;
    filename = `transactions_by_day_${new Date().toISOString().slice(0, 10)}.csv`;
  } else if (mode === "week") {
    data = chartWeekly;
    filename = `transactions_by_week_${thisYear}.csv`;
  } else if (mode === "month") {
    data = chartMonthly;
    filename = `transactions_by_month_${year}.csv`;
  } else {
    data = chartYearly;
    filename = `transactions_by_year_${fromYear}-${toYear}.csv`;
  }

  if (!data || data.length === 0) {
    toast.warning("No report available to download.");
    return;
  }

  const rows = data.map((r) => {
    if (mode === "day") {
      return {
        Day: r.dayLabel || r.day,
        TotalTransactions: r.totalTransactions,
        TotalSales: r.totalSales,
        TotalUnitsSold: r.totalUnitsSold,
        BestSellingProduct: r.bestProduct ?? "",
      };
    } else if (mode === "week") {
      return {
        Week: r.weekTooltip || r.week,
        TotalTransactions: r.totalTransactions,
        TotalSales: r.totalSales,
        TotalUnitsSold: r.totalUnitsSold,
        BestSellingProduct: r.bestProduct ?? "",
      };
    } else if (mode === "month") {
      return {
        Month: r.month,
        TotalTransactions: r.totalTransactions,
        TotalSales: r.totalSales,
        TotalUnitsSold: r.totalUnitsSold,
        BestSellingProduct: r.bestProduct ?? "",
      };
    } else {
      return {
        Year: r.year,
        TotalTransactions: r.totalTransactions,
        TotalSales: r.totalSales,
        TotalUnitsSold: r.totalUnitsSold,
        BestSellingProduct: r.bestProduct ?? "",
      };
    }
  });

  downloadCSV(filename, rows);
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
  //  DETAILED REPORT GENERATION
  // ===============================
  const generateDetailedReport = async (params: ReportParams) => {
    try {
      toast.info("Generating report...");
      const reportData = await fetchDetailedTransactionsForReport(params);
      
      if (!reportData.transactions || reportData.transactions.length === 0) {
        toast.warning("No transactions found for the selected period.");
        return;
      }

      // Group items by transaction
      const itemsByTransaction = new Map<string, TransactionItem[]>();
      reportData.items.forEach(item => {
        const existing = itemsByTransaction.get(item.TransactionID) || [];
        existing.push(item);
        itemsByTransaction.set(item.TransactionID, existing);
      });

      // Generate CSV rows
      const rows: any[] = [];
      
      reportData.transactions.forEach((transaction: Transaction) => {
        const items = itemsByTransaction.get(transaction.TransactionID) || [];
        
        if (items.length === 0) {
          // Transaction with no items
          rows.push({
            "Transaction ID": transaction.TransactionID,
            "Receipt Number": transaction.ReferenceNo || "",
            "Date": new Date(transaction.OrderDateTime).toLocaleString(),
            "Cashier": `${transaction.User?.FirstName || ""} ${transaction.User?.LastName || ""}`.trim(),
            "Payment Method": transaction.PaymentMethod,
            "Product Name": "",
            "Quantity": "",
            "Unit Price": "",
            "Subtotal": "",
            "Discount": "",
            "PWD/Senior ID": transaction.SeniorPWDID || "",
            "Transaction Total": transaction.Total,
          });
        } else {
          // Add a row for each item
          items.forEach((item: TransactionItem, index: number) => {
            rows.push({
              "Transaction ID": index === 0 ? transaction.TransactionID : "",
              "Receipt Number": index === 0 ? (transaction.ReferenceNo || "") : "",
              "Date": index === 0 ? new Date(transaction.OrderDateTime).toLocaleString() : "",
              "Cashier": index === 0 ? `${transaction.User?.FirstName || ""} ${transaction.User?.LastName || ""}`.trim() : "",
              "Payment Method": index === 0 ? transaction.PaymentMethod : "",
              "Product Name": item.Product?.Name || "",
              "Quantity": item.Quantity,
              "Unit Price": item.Product?.SellingPrice || 0,
              "Subtotal": item.Subtotal,
              "Discount": item.Discount?.DiscountPercent ? `${item.Discount.DiscountPercent}%` : "",
              "PWD/Senior ID": index === 0 ? (transaction.SeniorPWDID || "") : "",
              "Transaction Total": index === 0 ? transaction.Total : "",
            });
          });
        }
      });

      // Calculate total sales
      const totalSales = reportData.transactions.reduce((sum, t) => sum + (t.Total || 0), 0);
      
      // Add summary row
      rows.push({});
      rows.push({
        "Transaction ID": "",
        "Receipt Number": "",
        "Date": "",
        "Cashier": "",
        "Payment Method": "",
        "Product Name": "TOTAL SALES",
        "Quantity": "",
        "Unit Price": "",
        "Subtotal": "",
        "Discount": "",
        "PWD/Senior ID": "",
        "Transaction Total": totalSales,
      });

      // Generate filename
      let filename = "transaction_report";
      if (params.periodType === "day" && params.date) {
        filename = `transaction_report_${params.date}.csv`;
      } else if (params.periodType === "week" && params.week && params.month && params.year) {
        filename = `transaction_report_week${params.week}_${params.month}_${params.year}.csv`;
      } else if (params.periodType === "month" && params.month && params.year) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        filename = `transaction_report_${monthNames[params.month - 1]}_${params.year}.csv`;
      } else if (params.periodType === "year" && params.year) {
        filename = `transaction_report_${params.year}.csv`;
      }

      downloadCSV(filename, rows);
      toast.success("Report downloaded successfully!");
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(error?.response?.data?.message || "Failed to generate report");
    }
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
    // Detailed Report
    generateDetailedReport,
  } as const;
}
