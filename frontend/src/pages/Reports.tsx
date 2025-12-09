import { report_hooks } from "../hooks/report_hooks";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { ReportParams } from "../services/transactionService";

type ChartMode = "day" | "week" | "month" | "year";

interface ReportSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: ReportParams) => void;
}

function ReportSelectionModal({
  isOpen,
  onClose,
  onGenerate,
}: ReportSelectionModalProps) {
  const [periodType, setPeriodType] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  if (!isOpen) return null;

  const handleGenerate = () => {
    const params: ReportParams = {
      periodType,
    };

    if (periodType === "day") {
      if (!selectedDate) {
        toast.warning("Please select a date");
        return;
      }
      params.date = selectedDate;
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
      
      // Check if this week overlaps with the selected month
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
    <div className="drawer-content transform-none">
      <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
        <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Generate Detailed Report
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
                <option value="day">Day</option>
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
    </div>
  );
}

export default function Reports() {
  const {
    // controls
    mode,
    setMode,
    thisYear,
    year,
    setYear,
    type,
    setType,
    limit,
    setLimit,
    // top selling period controls
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
    // data
    topItems,
    reorder,
    chartData,
    // loading flags
    loadingChart,
    loadingTop,
    loadingReorder,
    // actions
    downloadTopCSV,
    downloadReorderCSV,
    // modal
    modalState,
    openDownloadModal,
    closeModal,
    // detailed report
    generateDetailedReport,
  } = report_hooks();

  // 🔒 SAFETY: never let Recharts / tables receive undefined
  const safeChart = Array.isArray(chartData) ? chartData : [];
  const safeTop = Array.isArray(topItems) ? topItems : [];
  const safeReorder = Array.isArray(reorder) ? reorder : [];

  return (
    <div className="bg-gray-50">
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-blue-900">REPORTS</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Total Transactions */}
          <div className="flex-1">
            <div className="bg-gray-50 ">
              <div className="px-6 py-4 flex justify-end border-b border-gray-200">
                <button
                  className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  onClick={() => openDownloadModal("Detailed Report", () => {})}
                >
                  Download Report
                </button>
              </div>

              <div className="bg-base-300 rounded-xl p-4 shadow min-w-0 h-96">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold text-lg">
                    Total Transaction per
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      className="select select-bordered select-sm"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as ChartMode)}
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>

                    {mode === "month" && (
                      <select
                        className="select select-bordered select-sm"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                      >
                        {[
                          thisYear,
                          thisYear - 1,
                          thisYear - 2,
                          thisYear - 3,
                          thisYear - 4,
                        ].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="h-72">
                  {loadingChart ? (
                    <div className="h-full w-full flex items-center justify-center opacity-60">
                      Loading...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={safeChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey={
                            mode === "day" ? "dayLabel" : 
                            mode === "week" ? "weekLabel" : 
                            mode === "month" ? "month" : 
                            "year"
                          } 
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (mode === "week" && name === "totalTransactions") {
                              const data = safeChart.find((d: any) => d.totalTransactions === value) as any;
                              return data?.weekTooltip ? [value, data.weekTooltip] : [value, name];
                            }
                            return [value, name];
                          }}
                          labelFormatter={(label) => {
                            if (mode === "week") {
                              const data = safeChart.find((d: any) => d.weekLabel === label) as any;
                              return data?.weekRange || label;
                            }
                            return label;
                          }}
                        />
                        <Bar dataKey="totalTransactions" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling */}
          <div className="flex-1">
            <div className="bg-gray-50 ">
              <div className="px-6 py-4 flex justify-end border-b border-gray-200">
                <button
                  className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  onClick={() =>
                    safeTop.length === 0
                      ? toast.warning("No report available to download.")
                      : openDownloadModal("Top Selling", downloadTopCSV)
                  }
                >
                  Download Report
                </button>
              </div>

              <div className="bg-base-300 rounded-xl p-4 shadow flex-1 min-w-0  min-h-96  max-h-96">
                <div className="flex justify-between items-center mb-3 ">
                  <h2 className="font-semibold text-lg">Top Selling</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      className="select select-bordered select-sm"
                      value={topPeriodType}
                      onChange={(e) => setTopPeriodType(e.target.value as ChartMode)}
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                    {topPeriodType === "day" && (
                      <input
                        type="date"
                        className="input input-bordered input-sm"
                        value={topDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setTopDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    )}
                    {topPeriodType === "week" && (
                      <>
                        <select
                          className="select select-bordered select-sm"
                          value={topMonth}
                          onChange={(e) => {
                            setTopMonth(Number(e.target.value));
                            setTopWeek(1);
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {new Date(2000, m - 1, 1).toLocaleString("default", { month: "short" })}
                            </option>
                          ))}
                        </select>
                        <select
                          className="select select-bordered select-sm"
                          value={topYear}
                          onChange={(e) => {
                            setTopYear(Number(e.target.value));
                            setTopWeek(1);
                          }}
                        >
                          {[
                            thisYear,
                            thisYear - 1,
                            thisYear - 2,
                            thisYear - 3,
                            thisYear - 4,
                          ].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                        <select
                          className="select select-bordered select-sm"
                          value={topWeek}
                          onChange={(e) => setTopWeek(Number(e.target.value))}
                        >
                          {(() => {
                            // Calculate weeks in selected month
                            const firstDay = new Date(topYear, topMonth - 1, 1);
                            const lastDay = new Date(topYear, topMonth, 0);
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
                              if (weekStart.getMonth() === topMonth - 1 || weekEnd.getMonth() === topMonth - 1) {
                                weeks.push(weekNum);
                              }
                              currentWeek.setDate(currentWeek.getDate() + 7);
                              weekNum++;
                            }
                            return weeks;
                          })().map((w) => (
                            <option key={w} value={w}>
                              Week {w}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    {topPeriodType === "month" && (
                      <>
                        <select
                          className="select select-bordered select-sm"
                          value={topMonth}
                          onChange={(e) => setTopMonth(Number(e.target.value))}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {new Date(2000, m - 1, 1).toLocaleString("default", { month: "short" })}
                            </option>
                          ))}
                        </select>
                        <select
                          className="select select-bordered select-sm"
                          value={topYear}
                          onChange={(e) => setTopYear(Number(e.target.value))}
                        >
                          {[
                            thisYear,
                            thisYear - 1,
                            thisYear - 2,
                            thisYear - 3,
                            thisYear - 4,
                          ].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    {topPeriodType === "year" && (
                      <select
                        className="select select-bordered select-sm"
                        value={topYear}
                        onChange={(e) => setTopYear(Number(e.target.value))}
                      >
                        {[
                          thisYear,
                          thisYear - 1,
                          thisYear - 2,
                          thisYear - 3,
                          thisYear - 4,
                        ].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      className="select select-bordered select-sm"
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as "product" | "category")
                      }
                    >
                      <option value="product">Products</option>
                      <option value="category">Categories</option>
                    </select>
                    <select
                      className="select select-bordered select-sm"
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                    >
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto h-72">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th className="text-center">Rank</th>
                        <th className="text-center">{type === "product" ? "Product" : "Category"}</th>
                        <th className="text-center">Qty Sold</th>
                        <th className="text-center">Revenue</th>
                        <th className="text-center">Avg Price</th>
                        <th className="text-center">Transactions</th>
                        <th className="text-center">% of Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTop ? (
                        <tr>
                          <td colSpan={7} className="text-center opacity-60">
                            Loading...
                          </td>
                        </tr>
                      ) : safeTop.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center opacity-60">
                            No data
                          </td>
                        </tr>
                      ) : (
                        safeTop.map((item, i) => (
                          <tr key={`${item.name ?? item.category}-${i}`}>
                            <td className="text-center">{i + 1}</td>
                            <td className="text-center">
                              {type === "product"
                                ? item.name ?? "Unknown Product"
                                : item.category ?? "Uncategorized"}
                            </td>
                            <td className="text-center">{item.sold ?? 0}</td>
                            <td className="text-center">₱{(item.revenue || 0).toFixed(2)}</td>
                            <td className="text-center">₱{(item.avgPrice || 0).toFixed(2)}</td>
                            <td className="text-center">{item.transactions || 0}</td>
                            <td className="text-center">{(item.percentageOfSales || 0).toFixed(2)}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reorder Level */}
        <div className="bg-gray-50 ">
          <div className="px-6 py-4 flex justify-end border-b border-gray-200 ">
            <button
              className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              onClick={() =>
                safeReorder.length === 0
                  ? toast.warning("No report available to download.")
                  : openDownloadModal("Reorder Level", downloadReorderCSV)
              }
            >
              Download Report
            </button>
          </div>

          <div className="bg-white rounded-lg p-6 min-w-0 shadow">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-lg">
                Reorder Level for Low on Stock
              </h2>
            </div>

            <div className="overflow-x-auto h-dvh">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Current Qty</th>
                    <th>Reorder Level</th>
                    <th>Suggested Reorder Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReorder ? (
                    <tr>
                      <td colSpan={4} className="text-center opacity-60">
                        Loading...
                      </td>
                    </tr>
                  ) : safeReorder.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center opacity-60">
                        No low stock
                      </td>
                    </tr>
                  ) : (
                    safeReorder.map((r) => (
                      <tr key={r.productId ?? r.name}>
                        <td>{r.name}</td>
                        <td>{r.totalStock ?? 0}</td>
                        <td>{r.reorderLevel ?? 0}</td>
                        <td>{r.reorderQuantity ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <ReportSelectionModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onGenerate={generateDetailedReport}
        />
      </div>
    </div>
  );
}
