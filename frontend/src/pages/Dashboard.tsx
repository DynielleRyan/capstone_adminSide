import { useNavigate } from "react-router-dom";
import { useDashboard } from "../hooks/dashboard_hooks";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from "recharts";
import { useMemo, useState } from "react"; // 🆕 to memoize chart data
import { toast } from "react-toastify";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    lowCount,
    expiringTotal,
    transactions,
    totalSales,
    currency,
    loading,
    open,
    setOpen,
    openLowModal,
    openExpModal,
    lowRows,
    expRows,
    loadingLow,
    loadingExp,
    generateLowReport,
    generateExpReport,
    chartData,
    chartView, // 🆕 from hook
    setChartView, // 🆕 from hook
    chartLoading, // 🆕 from hook
    // Sales Report
    salesPreviewData,
    loadingSalesPreview,
    generateSalesReport,
    confirmDownloadSalesReport,
    closeSalesPreview,
    salesReportModalOpen,
    openSalesReportModal,
    closeSalesReportModal,
  } = useDashboard();

  // 🧠 Optimize chart performance
  const safeChartData = useMemo(
    () => (Array.isArray(chartData) ? chartData : []),
    [chartData]
  );
  const disableAnim = safeChartData.length > 60;

  return (
    <div className="bg-gray-50">
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-blue-900">DASHBOARD</h1>

        {/* top metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Low on Stock"
            value={loading ? "…" : lowCount ?? 0}
            onMenu={openLowModal}
          />
          <MetricCard
            title="Expiring"
            value={loading ? "…" : expiringTotal ?? 0}
            onMenu={openExpModal}
          />
          <MetricCard
            title="Transactions"
            value={loading ? "…" : transactions ?? 0}
            onClick={() => navigate("/transactions")}
          />
        </div>

        {/* total sales card */}
        <div className="card">
          <div className="bg-base-300 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Total Sales</h2>
                <div className="text-blue-700 font-bold text-xl">
                  {currency}
                  {new Intl.NumberFormat().format(totalSales ?? 0)}
                </div>
                {/* 🆕 Current view label */}
                <div className="text-xs opacity-70 mt-1">
                  Viewing:{" "}
                  <span className="font-medium capitalize">{chartView}</span>
                </div>
              </div>
              <button
                className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                onClick={openSalesReportModal}
              >
                Generate Report
              </button>
            </div>

            {/* 🆕 Chart area with loading state */}
            <div className="mt-4 h-80">
              {chartLoading ? (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                  Loading chart…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={safeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value, name) => {
                        if (typeof value === "number" && name === "total") {
                          return [`₱${value.toFixed(2)}`, "total"];
                        }
                        return [value, name];
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="units"
                      fill="#4B9CE2"
                      isAnimationActive={!disableAnim}
                    />
                    <Line
                      yAxisId="right"
                      dataKey="total"
                      type="monotone"
                      stroke="orange"
                      strokeWidth={2}
                      isAnimationActive={!disableAnim}
                      dot={safeChartData.length <= 60}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-end">
              {/* 🆕 Hamburger dropdown */}
              <div className="dropdown  dropdown-top dropdown-end">
                <button
                  tabIndex={0}
                  className="btn btn-ghost btn-square"
                  title="Change chart view"
                >
                  <span className="text-2xl">≡</span>
                </button>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-[100] menu p-2 shadow bg-base-100 rounded-box w-40"
                >
                  <li>
                    <button onClick={() => setChartView("day")}>Daily</button>
                  </li>
                  <li>
                    <button onClick={() => setChartView("week")}>Weekly</button>
                  </li>
                  <li>
                    <button onClick={() => setChartView("month")}>
                      Monthly
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setChartView("year")}>Yearly</button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOW STOCK MODAL */}
      {open === "low" && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-[95vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Low on Stock (≤ 20)
              </h3>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  onClick={generateLowReport}
                >
                  Generate Report
                </button>
                <button
                  className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                  onClick={() => setOpen(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-auto min-h-0">
              <div className="preview-scroll-container overflow-x-auto overflow-y-auto h-full">
                <table className="w-full text-sm border-collapse min-w-full">
                  <thead className="bg-blue-800 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Expiry
                      </th>
                      <th className="px-6 py-3 text-left font-semibold whitespace-nowrap">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLow ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          Loading…
                        </td>
                      </tr>
                    ) : (Array.isArray(lowRows) ? lowRows : []).length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No low stock
                        </td>
                      </tr>
                    ) : (
                      (Array.isArray(lowRows) ? lowRows : []).map(
                        (r, index) => (
                          <tr
                            key={r.productId}
                            className={`${
                              index % 2 === 0 ? "bg-blue-50" : "bg-white"
                            } hover:bg-blue-100 transition-colors`}
                          >
                            <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {r.image && (
                                  <img
                                    src={r.image}
                                    alt={r.name}
                                    className="w-8 h-8 object-cover rounded"
                                  />
                                )}
                                <span>{r.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {r.category}
                            </td>
                            <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {r.brand}
                            </td>
                            <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {currency}
                              {(r.price ?? 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {r.expiry ?? "—"}
                            </td>
                            <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                              {r.qty ?? 0}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPIRING MODAL */}
      {open === "exp" && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-[95vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Expiring Products
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="inline-block w-4 h-4 rounded bg-yellow-300" />
                  <span>6 months</span>
                  <span className="inline-block w-4 h-4 rounded bg-red-400 ml-2" />
                  <span>3 months</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  onClick={generateExpReport}
                >
                  Generate Report
                </button>
                <button
                  className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                  onClick={() => setOpen(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-auto min-h-0">
              <div className="preview-scroll-container overflow-x-auto overflow-y-auto h-full">
                <table className="w-full text-sm border-collapse min-w-full">
                  <thead className="bg-blue-800 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold w-[20%] whitespace-nowrap">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left font-semibold whitespace-nowrap">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left font-semibold border-r border-white/20 whitespace-nowrap">
                        Expiry
                      </th>
                      <th className="px-6 py-3 text-left font-semibold whitespace-nowrap">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingExp ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          Loading…
                        </td>
                      </tr>
                    ) : (Array.isArray(expRows) ? expRows : []).length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No expiring items
                        </td>
                      </tr>
                    ) : (
                      (Array.isArray(expRows) ? expRows : []).map((r, i) => (
                        <tr
                          key={r.productItemId}
                          className={`${
                            i % 2 === 0 ? "bg-blue-50" : "bg-white"
                          } hover:bg-blue-100 transition-colors`}
                        >
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {r.productId}
                          </td>
                          <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {r.productName}
                          </td>
                          <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {r.category}
                          </td>
                          <td className="px-6 py-4 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {r.brand}
                          </td>
                          <td className="px-6 py-4 border-r border-gray-200 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                r.expiryLevel === "danger"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {r.expiryDate}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {r.qty ?? 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SALES REPORT PERIOD SELECTION MODAL */}
      <SalesReportPeriodModal
        isOpen={salesReportModalOpen}
        onClose={closeSalesReportModal}
        onGenerate={generateSalesReport}
      />

      {/* SALES REPORT PREVIEW MODAL */}
      <SalesReportPreviewModal
        isOpen={salesPreviewData.isOpen}
        onClose={closeSalesPreview}
        onConfirm={confirmDownloadSalesReport}
        data={salesPreviewData.rows}
        filename={salesPreviewData.filename}
        loading={loadingSalesPreview}
      />

    </div>
  );
}

function SalesReportPeriodModal({
  isOpen,
  onClose,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params?: {
    periodType?: "summary" | "day" | "week" | "month" | "year" | "dateRange";
    date?: string;
    startDate?: string;
    endDate?: string;
    week?: number;
    month?: number;
    year?: number;
  }) => void;
}) {
  const [periodType, setPeriodType] = useState<"summary" | "day" | "week" | "month" | "year" | "dateRange">("summary");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  if (!isOpen) return null;

  const handleGenerate = () => {
    const params: {
      periodType?: "summary" | "day" | "week" | "month" | "year" | "dateRange";
      date?: string;
      startDate?: string;
      endDate?: string;
      week?: number;
      month?: number;
      year?: number;
    } = {
      periodType,
    };

    if (periodType === "day") {
      if (!selectedDate) {
        toast.warning("Please select a date");
        return;
      }
      params.date = selectedDate;
    } else if (periodType === "dateRange") {
      if (!startDate || !endDate) {
        toast.warning("Please select both start and end dates");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.warning("Start date must be before or equal to end date");
        return;
      }
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (periodType === "week") {
      params.week = selectedWeek;
      params.month = selectedMonth;
      params.year = selectedYear;
    } else if (periodType === "month") {
      params.month = selectedMonth;
      params.year = selectedYear;
    } else if (periodType === "year") {
      params.year = selectedYear;
    }

    onGenerate(params);
    onClose();
  };

  // Get weeks in selected month
  const getWeeksInMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstMonday.setDate(firstDay.getDate() + daysToMonday);
    
    const lastMonday = new Date(lastDay);
    const lastDayOfWeek = lastDay.getDay();
    lastMonday.setDate(lastDay.getDate() - lastDayOfWeek);
    
    const weeks = [];
    let currentWeek = new Date(firstMonday);
    let weekNum = 1;
    
    while (currentWeek <= lastMonday) {
      const weekStart = new Date(currentWeek);
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      if (weekStart.getMonth() === month - 1 || weekEnd.getMonth() === month - 1) {
        weeks.push(weekNum);
      }
      
      currentWeek.setDate(currentWeek.getDate() + 7);
      weekNum++;
    }
    
    return weeks;
  };

  const weeks = periodType === "week" ? getWeeksInMonth(selectedMonth, selectedYear) : [];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Generate Sales Report
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {/* Period Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Period
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
            >
              <option value="summary">Summary (All Time)</option>
              <option value="day">Day</option>
              <option value="dateRange">Date Range</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>

          {/* Day Selection */}
          {periodType === "day" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}

          {/* Date Range Selection */}
          {periodType === "dateRange" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  min={startDate || undefined}
                />
              </div>
            </div>
          )}

          {/* Week Selection */}
          {periodType === "week" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(Number(e.target.value));
                      setSelectedWeek(1);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      setSelectedWeek(1);
                    }}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                >
                  {weeks.map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Month Selection */}
          {periodType === "month" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Year Selection */}
          {periodType === "year" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
              onClick={handleGenerate}
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesReportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  data,
  filename,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: any[];
  filename: string;
  loading: boolean;
}) {
  if (!isOpen) return null;

  // Get headers from first row
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  // Limit preview to first 50 rows for performance
  const previewRows = data.slice(0, 50);
  const hasMore = data.length > 50;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sales Report Preview
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {filename} ({data.length} rows)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading preview...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">No data to preview</div>
            </div>
          ) : (
            <div className="preview-scroll-container overflow-x-auto overflow-y-auto h-full">
              <table className="table table-zebra w-full text-sm min-w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {headers.map((header) => (
                        <td key={header} className="px-4 py-2 border-b border-gray-200 whitespace-nowrap">
                          {row[header] !== null && row[header] !== undefined
                            ? String(row[header])
                            : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing first 50 of {data.length} rows. Full data will be included in download.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
            onClick={onConfirm}
            disabled={loading || data.length === 0}
          >
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  onMenu,
  onClick,
}: {
  title: string;
  value: number | string;
  onMenu?: () => void;
  onClick?: () => void;
}) {
  return (
    <div className="card">
      <div
        className={`bg-base-300 rounded-xl p-4 shadow min-h-[120px] relative ${
          onClick ? "cursor-pointer hover:bg-base-200 transition-colors" : ""
        }`}
        onClick={onClick}
      >
        <div className="text-sm text-black-500 font-semibold">{title}</div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-5xl font-bold text-blue-700">{value}</div>
        </div>
        {onMenu && (
          <button
            className="btn btn-ghost btn-square absolute bottom-2 right-2"
            onClick={(e) => {
              e.stopPropagation();
              onMenu?.();
            }}
            title="Open list"
          >
            <span className="text-2xl">≡</span>
          </button>
        )}
      </div>
    </div>
  );
}
