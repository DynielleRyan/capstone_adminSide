// ===============================
//  Dashboard Hooks
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
import { fetchTransactions } from "../services/transactionService";
import { toast } from "react-toastify";

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
  const [chartView, setChartView] = useState<ChartView>("day");
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [seriesCache, setSeriesCache] = useState<Record<ChartView, any[]>>({
    day: [],
    week: [],
    month: [],
    year: [],
  });

  // -------- STATE: Sales Report Preview --------
  const [salesPreviewData, setSalesPreviewData] = useState<{
    rows: any[];
    filename: string;
    isOpen: boolean;
  }>({
    rows: [],
    filename: "",
    isOpen: false,
  });
  const [loadingSalesPreview, setLoadingSalesPreview] = useState(false);
  const [salesReportModalOpen, setSalesReportModalOpen] = useState(false);


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

  // Load chart initially based on default view
  useEffect(() => {
    loadChart(chartView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load when view changes
  useEffect(() => {
    loadChart(chartView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartView]);

  // ===============================
  //  CSV EXPORTS (direct download)
  // ===============================
  function generateLowReport() {
    const rows = lowRows.map((r) => ({
      "Product ID": r.productId,
      Product: r.name,
      Category: r.category,
      Brand: r.brand,
      Price: `₱${Number(r.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      Expiry: r.expiry ?? "",
      Qty: r.qty,
    }));
    
    const filename = `low_on_stock_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(filename, rows);
    toast.success("Report downloaded successfully!");
  }

  function generateExpReport() {
    // Filter out expired products (daysLeft < 0)
    const validRows = expRows.filter((r) => Number(r.daysLeft) >= 0);
    
    const rows = validRows.map((r) => ({
      ID: r.productId,
      Product: r.productName,
      Category: r.category,
      Brand: r.brand,
      Expiry: r.expiryDate,
      "Days Left": r.daysLeft,
      Qty: r.qty,
      Level: r.expiryLevel,
    }));
    
    const filename = `expiring_batches_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(filename, rows);
    toast.success("Report downloaded successfully!");
  }

  // ===============================
  //  SALES REPORT GENERATION
  // ===============================
  const generateSalesReport = async (params?: {
    periodType?: "summary" | "day" | "week" | "month" | "year" | "dateRange";
    date?: string;
    startDate?: string;
    endDate?: string;
    week?: number;
    month?: number;
    year?: number;
  }) => {
    try {
      setLoadingSalesPreview(true);
      toast.info("Generating sales report...");
      
      let allTransactions = await fetchTransactions();
      
      if (!allTransactions || allTransactions.length === 0) {
        toast.warning("No transactions found.");
        setLoadingSalesPreview(false);
        return;
      }

      // Filter transactions based on period if specified
      let transactions = allTransactions;
      const periodType = params?.periodType || "summary";
      
      if (periodType !== "summary") {
        transactions = allTransactions.filter(t => {
          const txnDate = new Date(t.OrderDateTime);
          
          if (periodType === "day" && params?.date) {
            const selectedDate = new Date(params.date);
            return txnDate.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
          } else if (periodType === "dateRange" && params?.startDate && params?.endDate) {
            const start = new Date(params.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            return txnDate >= start && txnDate <= end;
          } else if (periodType === "week" && params?.week && params?.month && params?.year) {
            // Calculate week range
            const firstDay = new Date(params.year, params.month - 1, 1);
            const dayOfWeek = firstDay.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const firstMonday = new Date(firstDay);
            firstMonday.setDate(firstDay.getDate() + daysToMonday);
            const weekStart = new Date(firstMonday);
            weekStart.setDate(firstMonday.getDate() + (params.week - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            return txnDate >= weekStart && txnDate <= weekEnd;
          } else if (periodType === "month" && params?.month && params?.year) {
            return txnDate.getMonth() === params.month - 1 && txnDate.getFullYear() === params.year;
          } else if (periodType === "year" && params?.year) {
            return txnDate.getFullYear() === params.year;
          }
          return true;
        });
      }
      
      if (transactions.length === 0) {
        toast.warning("No transactions found for the selected period.");
        setLoadingSalesPreview(false);
        return;
      }

      // Calculate totals
      const totalWithVAT = transactions.reduce((sum, t) => sum + (t.Total || 0), 0);
      const totalVAT = transactions.reduce((sum, t) => sum + (t.VATAmount || 0), 0);
      const totalWithoutVAT = totalWithVAT - totalVAT;
      const pwdSeniorCount = transactions.filter(t => t.SeniorPWDID).length;

      // Group by day
      const dailyData = new Map<string, {
        date: string;
        totalWithVAT: number;
        totalVAT: number;
        totalWithoutVAT: number;
        transactions: number;
        pwdSenior: number;
      }>();

      // Group by week
      const weeklyData = new Map<string, {
        week: string;
        totalWithVAT: number;
        totalVAT: number;
        totalWithoutVAT: number;
        transactions: number;
        pwdSenior: number;
      }>();

      // Group by month
      const monthlyData = new Map<string, {
        month: string;
        totalWithVAT: number;
        totalVAT: number;
        totalWithoutVAT: number;
        transactions: number;
        pwdSenior: number;
      }>();

      // Group by year
      const yearlyData = new Map<number, {
        year: number;
        totalWithVAT: number;
        totalVAT: number;
        totalWithoutVAT: number;
        transactions: number;
        pwdSenior: number;
      }>();

      transactions.forEach(transaction => {
        const date = new Date(transaction.OrderDateTime);
        const dateKey = date.toISOString().split('T')[0];
        const year = date.getFullYear();
        const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Calculate week
        const weekStart = new Date(date);
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(date.getDate() + daysToMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekKey = `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`;

        const total = transaction.Total || 0;
        const vat = transaction.VATAmount || 0;
        const withoutVAT = total - vat;
        const hasPWD = transaction.SeniorPWDID ? 1 : 0;

        // Daily
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, {
            date: dateKey,
            totalWithVAT: 0,
            totalVAT: 0,
            totalWithoutVAT: 0,
            transactions: 0,
            pwdSenior: 0,
          });
        }
        const dayData = dailyData.get(dateKey)!;
        dayData.totalWithVAT += total;
        dayData.totalVAT += vat;
        dayData.totalWithoutVAT += withoutVAT;
        dayData.transactions += 1;
        dayData.pwdSenior += hasPWD;

        // Weekly
        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            week: weekKey,
            totalWithVAT: 0,
            totalVAT: 0,
            totalWithoutVAT: 0,
            transactions: 0,
            pwdSenior: 0,
          });
        }
        const weekData = weeklyData.get(weekKey)!;
        weekData.totalWithVAT += total;
        weekData.totalVAT += vat;
        weekData.totalWithoutVAT += withoutVAT;
        weekData.transactions += 1;
        weekData.pwdSenior += hasPWD;

        // Monthly
        if (!monthlyData.has(month)) {
          monthlyData.set(month, {
            month,
            totalWithVAT: 0,
            totalVAT: 0,
            totalWithoutVAT: 0,
            transactions: 0,
            pwdSenior: 0,
          });
        }
        const monthData = monthlyData.get(month)!;
        monthData.totalWithVAT += total;
        monthData.totalVAT += vat;
        monthData.totalWithoutVAT += withoutVAT;
        monthData.transactions += 1;
        monthData.pwdSenior += hasPWD;

        // Yearly
        if (!yearlyData.has(year)) {
          yearlyData.set(year, {
            year,
            totalWithVAT: 0,
            totalVAT: 0,
            totalWithoutVAT: 0,
            transactions: 0,
            pwdSenior: 0,
          });
        }
        const yearData = yearlyData.get(year)!;
        yearData.totalWithVAT += total;
        yearData.totalVAT += vat;
        yearData.totalWithoutVAT += withoutVAT;
        yearData.transactions += 1;
        yearData.pwdSenior += hasPWD;
      });

      // Helper function to format numbers with commas
      const formatNumber = (num: number): string => {
        return num.toLocaleString('en-US');
      };

      const formatCurrency = (num: number): string => {
        return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Build CSV rows
      const rows: any[] = [];

      // Summary Section - Concise
      const periodLabel = periodType === "summary" ? "All Time" :
        periodType === "day" && params?.date ? params.date :
        periodType === "dateRange" && params?.startDate && params?.endDate ? `${params.startDate} to ${params.endDate}` :
        periodType === "week" && params?.week && params?.month && params?.year ? `Week ${params.week}, ${new Date(params.year, params.month - 1, 1).toLocaleString('default', { month: 'long' })} ${params.year}` :
        periodType === "month" && params?.month && params?.year ? `${new Date(params.year, params.month - 1, 1).toLocaleString('default', { month: 'long' })} ${params.year}` :
        periodType === "year" && params?.year ? params.year.toString() : "All Time";

      rows.push({
        "Section": "SUMMARY",
        "Period": periodLabel,
        "Total Sales (With VAT)": formatCurrency(totalWithVAT),
        "Total Sales (Without VAT)": formatCurrency(totalWithoutVAT),
        "Total VAT Amount": formatCurrency(totalVAT),
        "Number of Transactions": formatNumber(transactions.length),
        "PWD/Senior Discount Transactions": formatNumber(pwdSeniorCount),
      });
      rows.push({});

      // Daily Breakdown - Only for day, week, and dateRange (NOT summary)
      if (periodType === "day" || periodType === "week" || periodType === "dateRange") {
        rows.push({
          "Section": "DAILY BREAKDOWN",
          "Period": "",
          "Total Sales (With VAT)": "",
          "Total Sales (Without VAT)": "",
          "Total VAT Amount": "",
          "Number of Transactions": "",
          "PWD/Senior Discount Transactions": "",
        });
        Array.from(dailyData.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([_, data]) => {
            rows.push({
              "Section": "Day",
              "Period": data.date,
              "Total Sales (With VAT)": formatCurrency(data.totalWithVAT),
              "Total Sales (Without VAT)": formatCurrency(data.totalWithoutVAT),
              "Total VAT Amount": formatCurrency(data.totalVAT),
              "Number of Transactions": formatNumber(data.transactions),
              "PWD/Senior Discount Transactions": formatNumber(data.pwdSenior),
            });
          });
        rows.push({});
      }

      // Weekly Breakdown - Only for week and month (NOT summary)
      if (periodType === "week" || periodType === "month") {
        rows.push({
          "Section": "WEEKLY BREAKDOWN",
          "Period": "",
          "Total Sales (With VAT)": "",
          "Total Sales (Without VAT)": "",
          "Total VAT Amount": "",
          "Number of Transactions": "",
          "PWD/Senior Discount Transactions": "",
        });
        
        // Get all weeks sorted
        const sortedWeeks = Array.from(weeklyData.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));
        
        sortedWeeks.forEach(([_, data]) => {
          rows.push({
            "Section": "Week",
            "Period": data.week,
            "Total Sales (With VAT)": formatCurrency(data.totalWithVAT),
            "Total Sales (Without VAT)": formatCurrency(data.totalWithoutVAT),
            "Total VAT Amount": formatCurrency(data.totalVAT),
            "Number of Transactions": formatNumber(data.transactions),
            "PWD/Senior Discount Transactions": formatNumber(data.pwdSenior),
          });
        });
        
        // For monthly reports, check for remaining days
        if (periodType === "month" && params?.month && params?.year) {
          const monthEnd = new Date(params.year, params.month, 0, 23, 59, 59, 999);
          
          // Find the last complete week's end date
          let lastWeekEnd: Date | null = null;
          if (sortedWeeks.length > 0) {
            const lastWeekKey = sortedWeeks[sortedWeeks.length - 1][0];
            // Extract dates from week key (format: "YYYY-MM-DD to YYYY-MM-DD")
            const weekDates = lastWeekKey.split(" to ");
            if (weekDates.length === 2) {
              lastWeekEnd = new Date(weekDates[1]);
            }
          }
          
          // Check if there are days after the last complete week
          if (lastWeekEnd && lastWeekEnd < monthEnd) {
            const remainingStart = new Date(lastWeekEnd);
            remainingStart.setDate(remainingStart.getDate() + 1);
            remainingStart.setHours(0, 0, 0, 0);
            
            // Calculate totals for remaining days
            let remainingWithVAT = 0;
            let remainingWithoutVAT = 0;
            let remainingVAT = 0;
            let remainingTransactions = 0;
            let remainingPWD = 0;
            
            transactions.forEach(tx => {
              const txDate = new Date(tx.OrderDateTime);
              if (txDate >= remainingStart && txDate <= monthEnd) {
                const total = tx.Total || 0;
                const vat = tx.VATAmount || 0;
                const withoutVAT = total - vat;
                const hasPWD = tx.SeniorPWDID ? 1 : 0;
                
                remainingWithVAT += total;
                remainingWithoutVAT += withoutVAT;
                remainingVAT += vat;
                remainingTransactions += 1;
                remainingPWD += hasPWD;
              }
            });
            
            // Only add remaining days row if there are transactions
            if (remainingTransactions > 0) {
              const remainingEndStr = monthEnd.toISOString().split('T')[0];
              const remainingStartStr = remainingStart.toISOString().split('T')[0];
              rows.push({
                "Section": "Remaining Days",
                "Period": `${remainingStartStr} to ${remainingEndStr}`,
                "Total Sales (With VAT)": formatCurrency(remainingWithVAT),
                "Total Sales (Without VAT)": formatCurrency(remainingWithoutVAT),
                "Total VAT Amount": formatCurrency(remainingVAT),
                "Number of Transactions": formatNumber(remainingTransactions),
                "PWD/Senior Discount Transactions": formatNumber(remainingPWD),
              });
            }
          }
        }
        
        rows.push({});
      }

      // Monthly Breakdown - Only for month, year, and summary (NOT day or week)
      if (periodType === "month" || periodType === "year" || periodType === "summary") {
        rows.push({
          "Section": "MONTHLY BREAKDOWN",
          "Period": "",
          "Total Sales (With VAT)": "",
          "Total Sales (Without VAT)": "",
          "Total VAT Amount": "",
          "Number of Transactions": "",
          "PWD/Senior Discount Transactions": "",
        });
        Array.from(monthlyData.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([_, data]) => {
            rows.push({
              "Section": "Month",
              "Period": data.month,
              "Total Sales (With VAT)": formatCurrency(data.totalWithVAT),
              "Total Sales (Without VAT)": formatCurrency(data.totalWithoutVAT),
              "Total VAT Amount": formatCurrency(data.totalVAT),
              "Number of Transactions": formatNumber(data.transactions),
              "PWD/Senior Discount Transactions": formatNumber(data.pwdSenior),
            });
          });
        rows.push({});
      }

      // Yearly Breakdown - Only for summary and year
      if (periodType === "summary" || periodType === "year") {
        rows.push({
          "Section": "YEARLY BREAKDOWN",
          "Period": "",
          "Total Sales (With VAT)": "",
          "Total Sales (Without VAT)": "",
          "Total VAT Amount": "",
          "Number of Transactions": "",
          "PWD/Senior Discount Transactions": "",
        });
        Array.from(yearlyData.entries())
          .sort((a, b) => a[0] - b[0])
          .forEach(([_, data]) => {
            rows.push({
              "Section": "Year",
              "Period": data.year.toString(),
              "Total Sales (With VAT)": formatCurrency(data.totalWithVAT),
              "Total Sales (Without VAT)": formatCurrency(data.totalWithoutVAT),
              "Total VAT Amount": formatCurrency(data.totalVAT),
              "Number of Transactions": formatNumber(data.transactions),
              "PWD/Senior Discount Transactions": formatNumber(data.pwdSenior),
            });
          });
      }

      let filename = `total_sales_report_${new Date().toISOString().split('T')[0]}.csv`;
      if (periodType === "day" && params?.date) {
        filename = `total_sales_report_${params.date}.csv`;
      } else if (periodType === "dateRange" && params?.startDate && params?.endDate) {
        filename = `total_sales_report_${params.startDate}_to_${params.endDate}.csv`;
      } else if (periodType === "week" && params?.week && params?.month && params?.year) {
        filename = `total_sales_report_week${params.week}_${params.month}_${params.year}.csv`;
      } else if (periodType === "month" && params?.month && params?.year) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        filename = `total_sales_report_${monthNames[params.month - 1]}_${params.year}.csv`;
      } else if (periodType === "year" && params?.year) {
        filename = `total_sales_report_${params.year}.csv`;
      }
      
      setSalesPreviewData({
        rows,
        filename,
        isOpen: true,
      });
      setLoadingSalesPreview(false);
      toast.success("Sales report generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate sales report:", error);
      toast.error(error?.response?.data?.message || "Failed to generate sales report");
      setLoadingSalesPreview(false);
    }
  };

  // Confirm and download the previewed sales report
  const confirmDownloadSalesReport = () => {
    if (salesPreviewData.rows.length === 0) {
      toast.warning("No report data to download.");
      return;
    }
    downloadCSV(salesPreviewData.filename, salesPreviewData.rows);
    toast.success("Report downloaded successfully!");
    setSalesPreviewData({ rows: [], filename: "", isOpen: false });
  };

  // Close sales preview modal
  const closeSalesPreview = () => {
    setSalesPreviewData({ rows: [], filename: "", isOpen: false });
  };

  // Open sales report modal
  const openSalesReportModal = () => {
    setSalesReportModalOpen(true);
  };

  // Close sales report modal
  const closeSalesReportModal = () => {
    setSalesReportModalOpen(false);
  };

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

    // Low Stock Report
    generateLowReport,
    downloadLowCSV: generateLowReport, // Alias for backward compatibility
    // Expiring Report
    generateExpReport,
    downloadExpCSV: generateExpReport, // Alias for backward compatibility

    // Sales Report
    salesPreviewData,
    loadingSalesPreview,
    generateSalesReport,
    confirmDownloadSalesReport,
    closeSalesPreview,
    salesReportModalOpen,
    openSalesReportModal,
    closeSalesReportModal,
  } as const;
}
