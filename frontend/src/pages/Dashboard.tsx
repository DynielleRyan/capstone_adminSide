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
import { useMemo } from "react"; // 🆕 to memoize chart data

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
    downloadLowCSV,
    downloadExpCSV,
    chartData,
    chartView, // 🆕 from hook
    setChartView, // 🆕 from hook
    chartLoading, // 🆕 from hook
  } = useDashboard();

  // 🧠 Optimize chart performance
  const safeChartData = useMemo(
    () => (Array.isArray(chartData) ? chartData : []),
    [chartData]
  );
  const disableAnim = safeChartData.length > 60;

  return (
    <div className="bg-gray-50">
      <div className="space-y-6 m-4 ">
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
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
          <div className="w-[95%] max-w-5xl max-h-[90vh] flex flex-col">
            <div className="bg-white rounded-lg shadow-2xl flex flex-col max-h-full overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  Low on Stock (≤ 20)
                </h3>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={downloadLowCSV}
                  >
                    Download CSV
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                    onClick={() => setOpen(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Brand
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Expiry
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingLow ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            Loading…
                          </td>
                        </tr>
                      ) : (Array.isArray(lowRows) ? lowRows : []).length ===
                        0 ? (
                        <tr>
                          <td
                            colSpan={7}
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
                              <td className="px-6 py-4 text-gray-700">
                                {r.rowNo.toString().padStart(2, "0")}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
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
                              <td className="px-6 py-4 text-gray-700">
                                {r.category}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
                                {r.brand}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
                                {currency}
                                {(r.price ?? 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
                                {r.expiry ?? "—"}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
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
        </div>
      )}

      {/* EXPIRING MODAL */}
      {open === "exp" && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
          <div className="w-[95%] max-w-5xl max-h-[90vh] flex flex-col">
            <div className="bg-white rounded-lg shadow-2xl flex flex-col max-h-full overflow-hidden">
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
                    onClick={downloadExpCSV}
                  >
                    Download CSV
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                    onClick={() => setOpen(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">#</th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Brand
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
                          Expiry
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">
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
                            <td className="px-6 py-4 text-gray-700">
                              {(i + 1).toString().padStart(2, "0")}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {r.productName}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {r.category}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {r.brand}
                            </td>
                            <td className="px-6 py-4">
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
                            <td className="px-6 py-4 text-gray-700">
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
        </div>
      )}
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
