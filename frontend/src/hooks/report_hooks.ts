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
import { fetchDetailedTransactionsForReport, ReportParams } from "../services/transactionService";
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
    ...rows.map((r) => headers.map((h) => {
      const value = r[h];
      if (value === null || value === undefined) return "";
      // Don't quote empty strings
      if (value === "") return "";
      // Quote values that contain commas, quotes, or newlines
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(",")),
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
  const [mode, setMode] = useState<ChartMode>("day");
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
  const [topPeriodType, setTopPeriodType] = useState<ChartMode>("day");
  const [topYear, setTopYear] = useState<number>(thisYear);
  const [topMonth, setTopMonth] = useState<number>(new Date().getMonth() + 1);
  const [topWeek, setTopWeek] = useState<number>(1);
  const [topDate, setTopDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
        let date: string | undefined;
        let week: number | undefined;
        let month: number | undefined;
        let year: number | undefined;

        if (topPeriodType === "day") {
          date = topDate || new Date().toISOString().split('T')[0];
        } else if (topPeriodType === "week") {
          week = topWeek;
          month = topMonth;
          year = topYear;
        } else if (topPeriodType === "month") {
          month = topMonth;
          year = topYear;
        } else if (topPeriodType === "year") {
          year = topYear;
        }

        setTopItems(await getTopItems(type, limit, topPeriodType, date, week, month, year));
      } finally {
        setLoadingTop(false);
      }
    };
    run();
  }, [type, limit, topPeriodType, topDate, topWeek, topMonth, topYear]);

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

  const totalSales = topItems.reduce((sum, item) => sum + (item.revenue || 0), 0);

  const rows: any[] = topItems.map((it, i) => ({
    Rank: i + 1,
    [type === "product" ? "Product" : "Category"]:
      type === "product"
        ? it.name ?? "Unknown Product"
        : it.category ?? "Uncategorized",
    "Quantity Sold": it.sold,
    "Revenue": (it.revenue || 0).toFixed(2),
    "Average Unit Price": (it.avgPrice || 0).toFixed(2),
    "Number of Transactions": it.transactions || 0,
    "Percentage of Total Sales": `${(it.percentageOfSales || 0).toFixed(2)}%`,
  }));

  // Add summary row
  const totalQty = topItems.reduce((sum, item) => sum + item.sold, 0);
  const totalTxn = topItems.reduce((sum, item) => sum + (item.transactions || 0), 0);
  rows.push({
    Rank: "",
    [type === "product" ? "Product" : "Category"]: "TOTAL",
    "Quantity Sold": totalQty,
    "Revenue": totalSales.toFixed(2),
    "Average Unit Price": totalQty > 0 ? (totalSales / totalQty).toFixed(2) : "0.00",
    "Number of Transactions": totalTxn,
    "Percentage of Total Sales": "100.00%",
  });

  downloadCSV(`top_${type}_${topPeriodType}_${limit}.csv`, rows);
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

      let rows: any[] = [];
      let filename = "transaction_report";

      // Generate report based on period type
      if (params.periodType === "day") {
        // DAY REPORT: Transaction-level detail
        rows = generateDayReport(reportData.transactions, itemsByTransaction);
        if (params.date) {
          filename = `transaction_report_${params.date}.csv`;
        }
      } else if (params.periodType === "week") {
        // WEEK REPORT: Daily aggregates + weekly summary
        rows = generateWeekReport(reportData.transactions, itemsByTransaction, reportData.period);
        if (params.week && params.month && params.year) {
          filename = `transaction_report_week${params.week}_${params.month}_${params.year}.csv`;
        }
      } else if (params.periodType === "month") {
        // MONTH REPORT: Weekly aggregates + monthly summary
        rows = generateMonthReport(reportData.transactions, itemsByTransaction, reportData.period);
        if (params.month && params.year) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          filename = `transaction_report_${monthNames[params.month - 1]}_${params.year}.csv`;
        }
      } else if (params.periodType === "year") {
        // YEAR REPORT: Monthly aggregates + annual summary
        rows = generateYearReport(reportData.transactions, itemsByTransaction, reportData.period);
        if (params.year) {
          filename = `transaction_report_${params.year}.csv`;
        }
      }

      downloadCSV(filename, rows);
      toast.success("Report downloaded successfully!");
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(error?.response?.data?.message || "Failed to generate report");
    }
  };

  // Helper function to generate DAY report (transaction-level detail)
  const generateDayReport = (
    transactions: Transaction[],
    itemsByTransaction: Map<string, TransactionItem[]>
  ): any[] => {
    const rows: any[] = [];
    
    // Add header metadata (will be handled separately in CSV generation)
    // For now, start with transaction data headers
    rows.push({
      "Transaction ID": "Transaction ID",
      "Receipt Number": "Receipt Number",
      "Date": "Date",
      "Cashier": "Cashier",
      "Payment Method": "Payment Method",
      "Product Name": "Product Name",
      "Quantity": "Quantity",
      "Unit Price": "Unit Price",
      "Subtotal": "Subtotal",
      "Discount": "Discount",
      "PWD/Senior ID": "PWD/Senior ID",
      "Transaction Total": "Transaction Total",
    });

    transactions.forEach((transaction: Transaction) => {
      const items = itemsByTransaction.get(transaction.TransactionID) || [];
      
      if (items.length === 0) {
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

    // Calculate summary metrics
    const totalSales = transactions.reduce((sum, t) => sum + (t.Total || 0), 0);
    const totalTransactions = transactions.length;
    const totalUnits = Array.from(itemsByTransaction.values())
      .flat()
      .reduce((sum: number, item: TransactionItem) => sum + (item.Quantity || 0), 0);
    const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const pwdSeniorCount = transactions.filter(t => t.SeniorPWDID).length;

    // Add summary section
    rows.push({
      "Transaction ID": "",
      "Receipt Number": "",
      "Date": "",
      "Cashier": "",
      "Payment Method": "",
      "Product Name": "",
      "Quantity": "",
      "Unit Price": "",
      "Subtotal": "",
      "Discount": "",
      "PWD/Senior ID": "",
      "Transaction Total": "",
    });
    rows.push({
      "Transaction ID": "SUMMARY",
      "Receipt Number": "",
      "Date": "",
      "Cashier": "",
      "Payment Method": "",
      "Product Name": "",
      "Quantity": "",
      "Unit Price": "",
      "Subtotal": "",
      "Discount": "",
      "PWD/Senior ID": "",
      "Transaction Total": "",
    });
    rows.push({
      "Transaction ID": "Total Transactions",
      "Receipt Number": totalTransactions,
      "Date": "",
      "Cashier": "",
      "Payment Method": "",
      "Product Name": "",
      "Quantity": "",
      "Unit Price": "",
      "Subtotal": "",
      "Discount": "",
      "PWD/Senior ID": "",
      "Transaction Total": "",
    });
    rows.push({
      "Transaction ID": "Total Sales",
      "Receipt Number": "",
      "Date": "",
      "Cashier": "",
      "Payment Method": "",
      "Product Name": "",
      "Quantity": "",
      "Unit Price": "",
      "Subtotal": "",
      "Discount": "",
      "PWD/Senior ID": "",
      "Transaction Total": totalSales,
    });
    rows.push({
      "Transaction ID": "Total Units Sold",
      "Receipt Number": totalUnits,
      "Date": "",
      "Cashier": "",
      "Payment Method": "",
      "Product Name": "",
      "Quantity": "",
      "Unit Price": "",
      "Subtotal": "",
      "Discount": "",
      "PWD/Senior ID": "",
      "Transaction Total": "",
    });
    rows.push({
      "Transaction ID": "Average Transaction Value",
      "Receipt Number": avgTransactionValue.toFixed(2),
      "Date": "",
      "Cashier": "",
      "Payment Method": "",
      "Product Name": "",
      "Quantity": "",
      "Unit Price": "",
      "Subtotal": "",
      "Discount": "",
      "PWD/Senior ID": "",
      "Transaction Total": "",
    });
    rows.push({
      "Transaction ID": "PWD/Senior Transactions",
      "Receipt Number": pwdSeniorCount,
      "Date": "",
      "Cashier": "",
      "Payment Method": "",
      "Product Name": "",
      "Quantity": "",
      "Unit Price": "",
      "Subtotal": "",
      "Discount": "",
      "PWD/Senior ID": "",
      "Transaction Total": "",
    });

    return rows;
  };

  // Helper function to categorize payment methods
  const categorizePaymentMethod = (method: string): 'cash' | 'card' | 'other' => {
    const methodLower = method.toLowerCase();
    if (methodLower === 'cash') return 'cash';
    // Digital/card payments: card, gcash, maya, paymaya, etc.
    if (methodLower === 'card' || methodLower === 'gcash' || methodLower === 'maya' || 
        methodLower === 'paymaya' || methodLower.includes('card') || methodLower.includes('digital')) {
      return 'card';
    }
    // Everything else (insurance, mixed, etc.)
    return 'other';
  };

  // Helper function to generate WEEK report (daily aggregates + weekly summary)
  const generateWeekReport = (
    transactions: Transaction[],
    itemsByTransaction: Map<string, TransactionItem[]>,
    _period: { type: string; start: string; end: string }
  ): any[] => {
    const rows: any[] = [];
    
    // Group transactions by day
    const dailyData = new Map<string, {
      date: string;
      dayOfWeek: string;
      transactions: Transaction[];
      totalSales: number;
      totalTransactions: number;
      totalUnits: number;
      paymentMethods: { cash: number; card: number; other: number };
      pwdSeniorCount: number;
      topProducts: Map<string, number>;
    }>();

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    transactions.forEach(transaction => {
      const date = new Date(transaction.OrderDateTime);
      const dateKey = date.toISOString().split('T')[0];
      const dayOfWeek = dayNames[date.getDay()];

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          dayOfWeek,
          transactions: [],
          totalSales: 0,
          totalTransactions: 0,
          totalUnits: 0,
          paymentMethods: { cash: 0, card: 0, other: 0 },
          pwdSeniorCount: 0,
          topProducts: new Map(),
        });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.transactions.push(transaction);
      dayData.totalSales += transaction.Total || 0;
      dayData.totalTransactions += 1;
      const category = categorizePaymentMethod(transaction.PaymentMethod);
      dayData.paymentMethods[category] += 1;
      if (transaction.SeniorPWDID) dayData.pwdSeniorCount += 1;

      const items = itemsByTransaction.get(transaction.TransactionID) || [];
      items.forEach(item => {
        dayData.totalUnits += item.Quantity || 0;
        const productName = item.Product?.Name || "Unknown";
        dayData.topProducts.set(productName, (dayData.topProducts.get(productName) || 0) + (item.Quantity || 0));
      });
    });

    // Add header row with column names
    rows.push({
      "Date": "Date",
      "Day of Week": "Day of Week",
      "Total Transactions": "Total Transactions",
      "Total Sales": "Total Sales",
      "Total Units Sold": "Total Units Sold",
      "Avg Transaction Value": "Avg Transaction Value",
      "Cash Transactions": "Cash Transactions",
      "Card Transactions": "Card Transactions",
      "Other Payments": "Other Payments",
      "PWD/Senior Count": "PWD/Senior Count",
      "Top Product": "Top Product",
      "": "",
    });

    // Add daily summaries
    const sortedDays = Array.from(dailyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    sortedDays.forEach(([dateKey, dayData]) => {
      const avgTxnValue = dayData.totalTransactions > 0 ? dayData.totalSales / dayData.totalTransactions : 0;
      const topProduct = Array.from(dayData.topProducts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      rows.push({
        "Date": new Date(dateKey).toLocaleDateString(),
        "Day of Week": dayData.dayOfWeek,
        "Total Transactions": dayData.totalTransactions,
        "Total Sales": dayData.totalSales.toFixed(2),
        "Total Units Sold": dayData.totalUnits,
        "Avg Transaction Value": avgTxnValue.toFixed(2),
        "Cash Transactions": dayData.paymentMethods.cash || 0,
        "Card Transactions": dayData.paymentMethods.card || 0,
        "Other Payments": dayData.paymentMethods.other || 0,
        "PWD/Senior Count": dayData.pwdSeniorCount,
        "Top Product": topProduct,
        "": "",
      });
    });

    // Calculate weekly totals
    const weeklyTotalSales = transactions.reduce((sum, t) => sum + (t.Total || 0), 0);
    const weeklyTotalTransactions = transactions.length;
    const weeklyTotalUnits = Array.from(itemsByTransaction.values())
      .flat()
      .reduce((sum, item) => sum + (item.Quantity || 0), 0);
    const avgDailySales = weeklyTotalSales / sortedDays.length;
    const bestDay = sortedDays.reduce((best, current) => 
      current[1].totalSales > best[1].totalSales ? current : best
    );
    const worstDay = sortedDays.reduce((worst, current) => 
      current[1].totalSales < worst[1].totalSales ? current : worst
    );

    // Get top 5 products for the week
    const weeklyProducts = new Map<string, number>();
    itemsByTransaction.forEach(items => {
      items.forEach(item => {
        const productName = item.Product?.Name || "Unknown";
        weeklyProducts.set(productName, (weeklyProducts.get(productName) || 0) + (item.Quantity || 0));
      });
    });
    const top5Products = Array.from(weeklyProducts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Payment method totals (categorized)
    const paymentTotals = { cash: 0, card: 0, other: 0 };
    transactions.forEach(t => {
      const category = categorizePaymentMethod(t.PaymentMethod);
      paymentTotals[category] += 1;
    });

    const pwdSeniorTotal = transactions.filter(t => t.SeniorPWDID).length;

    // Add weekly summary
    rows.push({});
    rows.push({
      "Date": "WEEKLY SUMMARY",
      "Day of Week": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Total Transactions",
      "Day of Week": weeklyTotalTransactions,
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Total Sales",
      "Day of Week": "",
      "Total Transactions": "",
      "Total Sales": weeklyTotalSales.toFixed(2),
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Total Units Sold",
      "Day of Week": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": weeklyTotalUnits,
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Average Daily Sales",
      "Day of Week": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Transaction Value": avgDailySales.toFixed(2),
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Best Day",
      "Day of Week": bestDay[1].dayOfWeek,
      "Total Transactions": "",
      "Total Sales": bestDay[1].totalSales.toFixed(2),
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Worst Day",
      "Day of Week": worstDay[1].dayOfWeek,
      "Total Transactions": "",
      "Total Sales": worstDay[1].totalSales.toFixed(2),
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Payment Method - Cash",
      "Day of Week": paymentTotals.cash,
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "Payment Method - Card",
      "Day of Week": paymentTotals.card,
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    rows.push({
      "Date": "PWD/Senior Transactions",
      "Day of Week": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": pwdSeniorTotal,
      "Top Product": "",
      "": "",
    });
    rows.push({});
    rows.push({
      "Date": "TOP 5 PRODUCTS",
      "Day of Week": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Transaction Value": "",
      "Cash Transactions": "",
      "Card Transactions": "",
      "Other Payments": "",
      "PWD/Senior Count": "",
      "Top Product": "",
      "": "",
    });
    top5Products.forEach(([product, qty], index) => {
      rows.push({
        "Date": `${index + 1}. ${product}`,
        "Day of Week": "",
        "Total Transactions": "",
        "Total Sales": "",
        "Total Units Sold": qty,
        "Avg Transaction Value": "",
        "Cash Transactions": "",
        "Card Transactions": "",
        "Other Payments": "",
        "PWD/Senior Count": "",
        "Top Product": "",
        "": "",
      });
    });

    return rows;
  };

  // Helper function to generate MONTH report (weekly aggregates + monthly summary)
  const generateMonthReport = (
    transactions: Transaction[],
    itemsByTransaction: Map<string, TransactionItem[]>,
    _period: { type: string; start: string; end: string }
  ): any[] => {
    const rows: any[] = [];
    
    // Group transactions by week
    const weeklyData = new Map<number, {
      weekNum: number;
      weekStart: Date;
      weekEnd: Date;
      transactions: Transaction[];
      totalSales: number;
      totalTransactions: number;
      totalUnits: number;
    }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.OrderDateTime);
      const weekStart = new Date(date);
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(date.getDate() + daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      // Calculate week number in month
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstMonday = new Date(monthStart);
      const firstDayOfWeek = monthStart.getDay();
      const daysToFirstMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
      firstMonday.setDate(monthStart.getDate() + daysToFirstMonday);
      
      const weekNum = Math.floor((date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

      if (!weeklyData.has(weekNum)) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weeklyData.set(weekNum, {
          weekNum,
          weekStart: new Date(weekStart),
          weekEnd,
          transactions: [],
          totalSales: 0,
          totalTransactions: 0,
          totalUnits: 0,
        });
      }

      const weekData = weeklyData.get(weekNum)!;
      weekData.transactions.push(transaction);
      weekData.totalSales += transaction.Total || 0;
      weekData.totalTransactions += 1;

      const items = itemsByTransaction.get(transaction.TransactionID) || [];
      items.forEach(item => {
        weekData.totalUnits += item.Quantity || 0;
      });
    });

    // Add header row with column names
    rows.push({
      "Week": "Week",
      "Week Period": "Week Period",
      "Total Transactions": "Total Transactions",
      "Total Sales": "Total Sales",
      "Total Units Sold": "Total Units Sold",
      "Avg Daily Sales": "Avg Daily Sales",
      "Week-over-Week Growth": "Week-over-Week Growth",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });

    // Add weekly summaries
    const sortedWeeks = Array.from(weeklyData.entries()).sort((a, b) => a[0] - b[0]);
    let previousWeekSales = 0;
    sortedWeeks.forEach(([weekNum, weekData]) => {
      const avgDailySales = weekData.totalSales / 7;
      const weekGrowth = previousWeekSales > 0 
        ? ((weekData.totalSales - previousWeekSales) / previousWeekSales * 100).toFixed(2) + "%"
        : "N/A";

      rows.push({
        "Week": `Week ${weekNum}`,
        "Week Period": `${weekData.weekStart.toLocaleDateString()} - ${weekData.weekEnd.toLocaleDateString()}`,
        "Total Transactions": weekData.totalTransactions,
        "Total Sales": weekData.totalSales.toFixed(2),
        "Total Units Sold": weekData.totalUnits,
        "Avg Daily Sales": avgDailySales.toFixed(2),
        "Week-over-Week Growth": weekGrowth,
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
      });

      previousWeekSales = weekData.totalSales;
    });

    // Calculate monthly totals
    const monthlyTotalSales = transactions.reduce((sum, t) => sum + (t.Total || 0), 0);
    const monthlyTotalTransactions = transactions.length;
    const monthlyTotalUnits = Array.from(itemsByTransaction.values())
      .flat()
      .reduce((sum, item) => sum + (item.Quantity || 0), 0);
    const firstTransactionDate = transactions.length > 0 ? new Date(transactions[0].OrderDateTime) : new Date();
    const daysInMonth = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth() + 1, 0).getDate();
    const avgDailySales = monthlyTotalSales / daysInMonth;
    const avgTransactionValue = monthlyTotalTransactions > 0 ? monthlyTotalSales / monthlyTotalTransactions : 0;

    // Get top 10 products
    const monthlyProducts = new Map<string, number>();
    itemsByTransaction.forEach(items => {
      items.forEach(item => {
        const productName = item.Product?.Name || "Unknown";
        monthlyProducts.set(productName, (monthlyProducts.get(productName) || 0) + (item.Quantity || 0));
      });
    });
    const top10Products = Array.from(monthlyProducts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get top 5 categories
    const monthlyCategories = new Map<string, number>();
    itemsByTransaction.forEach(items => {
      items.forEach(item => {
        const category = item.Product?.Category || "Uncategorized";
        monthlyCategories.set(category, (monthlyCategories.get(category) || 0) + (item.Quantity || 0));
      });
    });
    const top5Categories = Array.from(monthlyCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Payment method distribution (categorized)
    const paymentMethods = { cash: 0, card: 0, other: 0 };
    transactions.forEach(t => {
      const category = categorizePaymentMethod(t.PaymentMethod);
      paymentMethods[category] += 1;
    });

    const pwdSeniorTotal = transactions.filter(t => t.SeniorPWDID).length;
    const bestWeek = sortedWeeks.reduce((best, current) => 
      current[1].totalSales > best[1].totalSales ? current : best
    );

    // Add monthly summary
    rows.push({});
    rows.push({
      "Week": "MONTHLY SUMMARY",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Week": "Total Transactions",
      "Week Period": monthlyTotalTransactions,
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Week": "Total Sales",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": monthlyTotalSales.toFixed(2),
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Week": "Total Units Sold",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": monthlyTotalUnits,
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Week": "Average Daily Sales",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": avgDailySales.toFixed(2),
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Week": "Average Transaction Value",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": avgTransactionValue.toFixed(2),
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Week": "Best Week",
      "Week Period": `Week ${bestWeek[0]} (${bestWeek[1].totalSales.toFixed(2)})`,
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Week": "PWD/Senior Transactions",
      "Week Period": pwdSeniorTotal,
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({});
    rows.push({
      "Week": "TOP 10 PRODUCTS",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    top10Products.forEach(([product, qty], index) => {
      rows.push({
        "Week": `${index + 1}. ${product}`,
        "Week Period": "",
        "Total Transactions": "",
        "Total Sales": "",
        "Total Units Sold": qty,
        "Avg Daily Sales": "",
        "Week-over-Week Growth": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
      });
    });
    rows.push({});
    rows.push({
      "Week": "TOP 5 CATEGORIES",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    top5Categories.forEach(([category, qty], index) => {
      rows.push({
        "Week": `${index + 1}. ${category}`,
        "Week Period": "",
        "Total Transactions": "",
        "Total Sales": "",
        "Total Units Sold": qty,
        "Avg Daily Sales": "",
        "Week-over-Week Growth": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
      });
    });
    rows.push({});
    rows.push({
      "Week": "PAYMENT METHOD DISTRIBUTION",
      "Week Period": "",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Week-over-Week Growth": "",
      "": "",
      "": "",
      "": "",
      "": "",
      "": "",
    });
    Object.entries(paymentMethods).forEach(([method, count]) => {
      const percentage = ((count / monthlyTotalTransactions) * 100).toFixed(1);
      const methodLabel = method === 'cash' ? 'CASH' : method === 'card' ? 'CARD/DIGITAL' : 'OTHER';
      rows.push({
        "Week": methodLabel,
        "Week Period": `${count} (${percentage}%)`,
        "Total Transactions": "",
        "Total Sales": "",
        "Total Units Sold": "",
        "Avg Daily Sales": "",
        "Week-over-Week Growth": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
      });
    });

    return rows;
  };

  // Helper function to generate YEAR report (monthly aggregates + annual summary)
  const generateYearReport = (
    transactions: Transaction[],
    itemsByTransaction: Map<string, TransactionItem[]>,
    period: { type: string; start: string; end: string }
  ): any[] => {
    const rows: any[] = [];
    
    // Group transactions by month
    const monthlyData = new Map<number, {
      month: number;
      monthName: string;
      transactions: Transaction[];
      totalSales: number;
      totalTransactions: number;
      totalUnits: number;
    }>();

    const monthNames = ["January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"];

    transactions.forEach(transaction => {
      const date = new Date(transaction.OrderDateTime);
      const month = date.getMonth();

      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          month,
          monthName: monthNames[month],
          transactions: [],
          totalSales: 0,
          totalTransactions: 0,
          totalUnits: 0,
        });
      }

      const monthData = monthlyData.get(month)!;
      monthData.transactions.push(transaction);
      monthData.totalSales += transaction.Total || 0;
      monthData.totalTransactions += 1;

      const items = itemsByTransaction.get(transaction.TransactionID) || [];
      items.forEach(item => {
        monthData.totalUnits += item.Quantity || 0;
      });
    });

    // Add header row with column names
    const year = new Date(period.start).getFullYear();
    rows.push({
      "Month": "Month",
      "Total Transactions": "Total Transactions",
      "Total Sales": "Total Sales",
      "Total Units Sold": "Total Units Sold",
      "Avg Daily Sales": "Avg Daily Sales",
      "Avg Transaction Value": "Avg Transaction Value",
      "MoM Growth": "MoM Growth",
      "Best Day": "Best Day",
      "Top 5 Products": "Top 5 Products",
      "": "",
      "": "",
      "": "",
    });

    // Add monthly summaries
    const sortedMonths = Array.from(monthlyData.entries()).sort((a, b) => a[0] - b[0]);
    let previousMonthSales = 0;
    sortedMonths.forEach(([month, monthData]) => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const avgDailySales = monthData.totalSales / daysInMonth;
      const avgTransactionValue = monthData.totalTransactions > 0 
        ? monthData.totalSales / monthData.totalTransactions 
        : 0;
      const momGrowth = previousMonthSales > 0 
        ? ((monthData.totalSales - previousMonthSales) / previousMonthSales * 100).toFixed(2) + "%"
        : "N/A";

      // Find best day in month
      const daySales = new Map<number, number>();
      monthData.transactions.forEach(t => {
        const day = new Date(t.OrderDateTime).getDate();
        daySales.set(day, (daySales.get(day) || 0) + (t.Total || 0));
      });
      const bestDay = Array.from(daySales.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      // Get top 5 products for month
      const monthProducts = new Map<string, number>();
      monthData.transactions.forEach(t => {
        const items = itemsByTransaction.get(t.TransactionID) || [];
        items.forEach(item => {
          const productName = item.Product?.Name || "Unknown";
          monthProducts.set(productName, (monthProducts.get(productName) || 0) + (item.Quantity || 0));
        });
      });
      const top5Products = Array.from(monthProducts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name)
        .join(", ");

      rows.push({
        "Month": monthData.monthName,
        "Total Transactions": monthData.totalTransactions,
        "Total Sales": monthData.totalSales.toFixed(2),
        "Total Units Sold": monthData.totalUnits,
        "Avg Daily Sales": avgDailySales.toFixed(2),
        "Avg Transaction Value": avgTransactionValue.toFixed(2),
        "MoM Growth": momGrowth,
        "Best Day": bestDay.toString(),
        "Top 5 Products": top5Products,
        "": "",
        "": "",
        "": "",
      });

      previousMonthSales = monthData.totalSales;
    });

    // Calculate quarterly summaries
    const quarters: { quarter: string; months: number[]; totalSales: number; avgMonthly: number }[] = [
      { quarter: "Q1", months: [0, 1, 2], totalSales: 0, avgMonthly: 0 },
      { quarter: "Q2", months: [3, 4, 5], totalSales: 0, avgMonthly: 0 },
      { quarter: "Q3", months: [6, 7, 8], totalSales: 0, avgMonthly: 0 },
      { quarter: "Q4", months: [9, 10, 11], totalSales: 0, avgMonthly: 0 },
    ];

    quarters.forEach(quarter => {
      const quarterMonths = sortedMonths.filter(([month]) => quarter.months.includes(month));
      quarter.totalSales = quarterMonths.reduce((sum, [, data]) => sum + data.totalSales, 0);
      quarter.avgMonthly = quarterMonths.length > 0 ? quarter.totalSales / quarterMonths.length : 0;
    });

    // Calculate annual totals
    const annualTotalSales = transactions.reduce((sum, t) => sum + (t.Total || 0), 0);
    const annualTotalTransactions = transactions.length;
    const annualTotalUnits = Array.from(itemsByTransaction.values())
      .flat()
      .reduce((sum, item) => sum + (item.Quantity || 0), 0);
    const avgMonthlySales = annualTotalSales / 12;
    const avgDailySales = annualTotalSales / 365;
    const avgTransactionValue = annualTotalTransactions > 0 ? annualTotalSales / annualTotalTransactions : 0;

    // Get top 20 products
    const annualProducts = new Map<string, number>();
    itemsByTransaction.forEach(items => {
      items.forEach(item => {
        const productName = item.Product?.Name || "Unknown";
        annualProducts.set(productName, (annualProducts.get(productName) || 0) + (item.Quantity || 0));
      });
    });
    const top20Products = Array.from(annualProducts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    // Get top 10 categories
    const annualCategories = new Map<string, number>();
    itemsByTransaction.forEach(items => {
      items.forEach(item => {
        const category = item.Product?.Category || "Uncategorized";
        annualCategories.set(category, (annualCategories.get(category) || 0) + (item.Quantity || 0));
      });
    });
    const top10Categories = Array.from(annualCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Payment method distribution (categorized)
    const paymentMethods = { cash: 0, card: 0, other: 0 };
    transactions.forEach(t => {
      const category = categorizePaymentMethod(t.PaymentMethod);
      paymentMethods[category] += 1;
    });

    const pwdSeniorTotal = transactions.filter(t => t.SeniorPWDID).length;
    const bestMonth = sortedMonths.reduce((best, current) => 
      current[1].totalSales > best[1].totalSales ? current : best
    );
    const bestQuarter = quarters.reduce((best, current) => 
      current.totalSales > best.totalSales ? current : best
    );

    // Add quarterly summary
    rows.push({});
    rows.push({
      "Month": "QUARTERLY SUMMARY",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    quarters.forEach(quarter => {
      rows.push({
        "Month": quarter.quarter,
        "Total Transactions": "",
        "Total Sales": quarter.totalSales.toFixed(2),
        "Total Units Sold": "",
        "Avg Daily Sales": "",
        "Avg Transaction Value": "",
        "MoM Growth": "",
        "Best Day": "",
        "Top 5 Products": `Avg Monthly: ${quarter.avgMonthly.toFixed(2)}`,
        "": "",
        "": "",
        "": "",
      });
    });

    // Add annual summary
    rows.push({});
    rows.push({
      "Month": "ANNUAL SUMMARY",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Total Transactions",
      "Total Transactions": annualTotalTransactions,
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Total Sales",
      "Total Transactions": "",
      "Total Sales": annualTotalSales.toFixed(2),
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Total Units Sold",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": annualTotalUnits,
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Average Monthly Sales",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": avgMonthlySales.toFixed(2),
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Average Daily Sales",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": avgDailySales.toFixed(2),
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Average Transaction Value",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": avgTransactionValue.toFixed(2),
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Best Month",
      "Total Transactions": "",
      "Total Sales": bestMonth[1].totalSales.toFixed(2),
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": bestMonth[1].monthName,
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "Best Quarter",
      "Total Transactions": "",
      "Total Sales": bestQuarter.totalSales.toFixed(2),
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": bestQuarter.quarter,
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({
      "Month": "PWD/Senior Transactions",
      "Total Transactions": pwdSeniorTotal,
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    rows.push({});
    rows.push({
      "Month": "TOP 20 PRODUCTS",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    top20Products.forEach(([product, qty], index) => {
      rows.push({
        "Month": `${index + 1}. ${product}`,
        "Total Transactions": "",
        "Total Sales": "",
        "Total Units Sold": qty,
        "Avg Daily Sales": "",
        "Avg Transaction Value": "",
        "MoM Growth": "",
        "Best Day": "",
        "Top 5 Products": "",
        "": "",
        "": "",
        "": "",
      });
    });
    rows.push({});
    rows.push({
      "Month": "TOP 10 CATEGORIES",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    top10Categories.forEach(([category, qty], index) => {
      rows.push({
        "Month": `${index + 1}. ${category}`,
        "Total Transactions": "",
        "Total Sales": "",
        "Total Units Sold": qty,
        "Avg Daily Sales": "",
        "Avg Transaction Value": "",
        "MoM Growth": "",
        "Best Day": "",
        "Top 5 Products": "",
        "": "",
        "": "",
        "": "",
      });
    });
    rows.push({});
    rows.push({
      "Month": "PAYMENT METHOD DISTRIBUTION",
      "Total Transactions": "",
      "Total Sales": "",
      "Total Units Sold": "",
      "Avg Daily Sales": "",
      "Avg Transaction Value": "",
      "MoM Growth": "",
      "Best Day": "",
      "Top 5 Products": "",
      "": "",
      "": "",
      "": "",
    });
    Object.entries(paymentMethods).forEach(([method, count]) => {
      const percentage = ((count / annualTotalTransactions) * 100).toFixed(1);
      const methodLabel = method === 'cash' ? 'CASH' : method === 'card' ? 'CARD/DIGITAL' : 'OTHER';
      rows.push({
        "Month": methodLabel,
        "Total Transactions": count,
        "Total Sales": "",
        "Total Units Sold": "",
        "Avg Daily Sales": "",
        "Avg Transaction Value": "",
        "MoM Growth": "",
        "Best Day": "",
        "Top 5 Products": `${percentage}%`,
        "": "",
        "": "",
        "": "",
      });
    });

    return rows;
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
    // Top Selling Period Controls
    topPeriodType,
    setTopPeriodType,
    topYear,
    setTopYear,
    topMonth,
    setTopMonth,
    topWeek,
    setTopWeek,
    topDate,
    setTopDate,
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
