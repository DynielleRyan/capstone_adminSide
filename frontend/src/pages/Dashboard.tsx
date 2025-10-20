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

      {/* LOW STOCK MODAL */}
      {open === "low" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-[95%]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Low on Stock (≤ 20)</h3>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={downloadLowCSV}
                >
                  Download CSV
                </button>
                <button className="btn btn-sm" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 overflow-x-auto max-h-96 overflow-y-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Price</th>
                    <th>Expiry</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLow ? (
                    <tr>
                      <td colSpan={7} className="text-center">
                        Loading…
                      </td>
                    </tr>
                  ) : (Array.isArray(lowRows) ? lowRows : []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center opacity-60">
                        No low stock
                      </td>
                    </tr>
                  ) : (
                    (Array.isArray(lowRows) ? lowRows : []).map((r) => (
                      <tr key={r.productId}>
                        <td>{r.rowNo.toString().padStart(2, "0")}</td>
                        <td className="flex items-center gap-2">
                          {r.image && (
                            <img
                              src={r.image}
                              alt={r.name}
                              className="w-8 h-8 object-cover rounded"
                            />
                          )}
                          {r.name}
                        </td>
                        <td>{r.category}</td>
                        <td>{r.brand}</td>
                        <td>
                          {currency}
                          {(r.price ?? 0).toFixed(2)}
                        </td>
                        <td>{r.expiry ?? "—"}</td>
                        <td>{r.qty ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPIRING MODAL */}
      {open === "exp" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-[95%]">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Expiring Products</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="inline-block w-4 h-4 rounded bg-yellow-300" />
                  Yellow – 6 months
                  <span className="inline-block w-4 h-4 rounded bg-red-400" />
                  Red – 3 months
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={downloadExpCSV}
                >
                  Download CSV
                </button>
                <button className="btn btn-sm" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 overflow-x-auto max-h-96 overflow-y-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Expiry</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingExp ? (
                    <tr>
                      <td colSpan={6} className="text-center">
                        Loading…
                      </td>
                    </tr>
                  ) : (Array.isArray(expRows) ? expRows : []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center opacity-60">
                        No expiring items
                      </td>
                    </tr>
                  ) : (
                    (Array.isArray(expRows) ? expRows : []).map((r, i) => (
                      <tr key={r.productItemId}>
                        <td>{(i + 1).toString().padStart(2, "0")}</td>
                        <td>{r.productName}</td>
                        <td>{r.category}</td>
                        <td>{r.brand}</td>
                        <td>
                          <span
                            className={`px-2 py-1 rounded ${
                              r.expiryLevel === "danger"
                                ? "bg-red-200"
                                : "bg-yellow-200"
                            }`}
                          >
                            {r.expiryDate}
                          </span>
                        </td>
                        <td>{r.qty ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
