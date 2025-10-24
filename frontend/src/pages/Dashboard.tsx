// frontend/src/pages/Dashboard.tsx
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
  } = useDashboard();

  // 🔒 SAFETY: Recharts must always get an array
  const safeChartData = Array.isArray(chartData) ? chartData : [];

  return (
    <>
      <div className="space-y-6">
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
              </div>
            </div>

            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={safeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="units" fill="#4B9CE2" />
                  <Line yAxisId="right" dataKey="total" type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* LOW STOCK MODAL */}
      {open === "low" && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
          <div className="w-[95%] max-w-5xl max-h-[90vh] flex flex-col">
            <div className="bg-white rounded-lg shadow-2xl flex flex-col max-h-full overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Low on Stock (≤ 20)</h3>
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

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">ID</th>
                        <th className="px-6 py-3 text-left font-semibold">Product</th>
                        <th className="px-6 py-3 text-left font-semibold">Category</th>
                        <th className="px-6 py-3 text-left font-semibold">Brand</th>
                        <th className="px-6 py-3 text-left font-semibold">Price</th>
                        <th className="px-6 py-3 text-left font-semibold">Expiry</th>
                        <th className="px-6 py-3 text-left font-semibold">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingLow ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            Loading…
                          </td>
                        </tr>
                      ) : (Array.isArray(lowRows) ? lowRows : []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No low stock
                          </td>
                        </tr>
                      ) : (
                        (Array.isArray(lowRows) ? lowRows : []).map((r, index) => (
                          <tr 
                            key={r.productId} 
                            className={`${
                              index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                            } hover:bg-blue-100 transition-colors`}
                          >
                            <td className="px-6 py-4 text-gray-700">{r.rowNo.toString().padStart(2, "0")}</td>
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
                            <td className="px-6 py-4 text-gray-700">{r.category}</td>
                            <td className="px-6 py-4 text-gray-700">{r.brand}</td>
                            <td className="px-6 py-4 text-gray-700">
                              {currency}
                              {(r.price ?? 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-gray-700">{r.expiry ?? "—"}</td>
                            <td className="px-6 py-4 text-gray-700">{r.qty ?? 0}</td>
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

      {/* EXPIRING MODAL */}
      {open === "exp" && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
          <div className="w-[95%] max-w-5xl max-h-[90vh] flex flex-col">
            <div className="bg-white rounded-lg shadow-2xl flex flex-col max-h-full overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">Expiring Products</h3>
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

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">#</th>
                        <th className="px-6 py-3 text-left font-semibold">Product</th>
                        <th className="px-6 py-3 text-left font-semibold">Category</th>
                        <th className="px-6 py-3 text-left font-semibold">Brand</th>
                        <th className="px-6 py-3 text-left font-semibold">Expiry</th>
                        <th className="px-6 py-3 text-left font-semibold">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingExp ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            Loading…
                          </td>
                        </tr>
                      ) : (Array.isArray(expRows) ? expRows : []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No expiring items
                          </td>
                        </tr>
                      ) : (
                        (Array.isArray(expRows) ? expRows : []).map((r, i) => (
                          <tr 
                            key={r.productItemId} 
                            className={`${
                              i % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                            } hover:bg-blue-100 transition-colors`}
                          >
                            <td className="px-6 py-4 text-gray-700">{(i + 1).toString().padStart(2, "0")}</td>
                            <td className="px-6 py-4 text-gray-700">{r.productName}</td>
                            <td className="px-6 py-4 text-gray-700">{r.category}</td>
                            <td className="px-6 py-4 text-gray-700">{r.brand}</td>
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
                            <td className="px-6 py-4 text-gray-700">{r.qty ?? 0}</td>
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
    </>
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
