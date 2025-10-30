import { report_hooks } from "../hooks/report_hooks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ChartMode = "month" | "year";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reportType: string;
}

function DownloadModal({
  isOpen,
  onClose,
  onConfirm,
  reportType,
}: DownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="drawer-content transform-none">
      <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Download
            </h3>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Are you sure you want to download the {reportType} report as CSV?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                Download
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
    // data
    topItems,
    reorder,
    chartData,
    // loading flags
    loadingChart,
    loadingTop,
    loadingReorder,
    // actions
    downloadChartCSV,
    downloadTopCSV,
    downloadReorderCSV,
    // modal
    modalState,
    openDownloadModal,
    closeModal,
  } = report_hooks();

  // 🔒 SAFETY: never let Recharts / tables receive undefined
  const safeChart = Array.isArray(chartData) ? chartData : [];
  const safeTop = Array.isArray(topItems) ? topItems : [];
  const safeReorder = Array.isArray(reorder) ? reorder : [];

  return (
    <div className="space-y-6 m-5">
      <h1 className="text-3xl font-bold text-blue-700">REPORTS</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Total Transactions */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 flex justify-end border-b border-gray-200">
              <button
                className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                onClick={() =>
                  openDownloadModal("Transaction Chart", downloadChartCSV)
                }
              >
                Download Report
              </button>
            </div>

            <div className="bg-base-300 rounded-xl p-4 shadow min-w-0 h-96">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-lg">Total Transaction per</h2>
                <div className="flex items-center gap-2">
                  <select
                    className="select select-bordered select-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ChartMode)}
                  >
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
                      <XAxis dataKey={mode === "month" ? "month" : "year"} />
                      <YAxis />
                      <Tooltip />
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
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 flex justify-end border-b border-gray-200">
              <button
                className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                onClick={() => openDownloadModal("Top Selling", downloadTopCSV)}
              >
                Download Report
              </button>
            </div>

            <div className="bg-base-300 rounded-xl p-4 shadow flex-1 min-w-0  min-h-96  max-h-96">
              <div className="flex justify-between items-center mb-3 ">
                <h2 className="font-semibold text-lg">Top Selling</h2>
                <div className="flex items-center gap-2">
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
                      <th>Top</th>
                      <th>{type === "product" ? "Product" : "Category"}</th>
                      <th>Quantity Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTop ? (
                      <tr>
                        <td colSpan={3} className="text-center opacity-60">
                          Loading...
                        </td>
                      </tr>
                    ) : safeTop.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center opacity-60">
                          No data
                        </td>
                      </tr>
                    ) : (
                      safeTop.map((item, i) => (
                        <tr key={`${item.name ?? item.category}-${i}`}>
                          <td>{i + 1}</td>
                          <td>
                            {type === "product"
                              ? item.name ?? "Unknown Product"
                              : item.category ?? "Uncategorized"}
                          </td>
                          <td>{item.sold ?? 0}</td>
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
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 flex justify-end border-b border-gray-200">
          <button
            className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            onClick={() =>
              openDownloadModal("Reorder Level", downloadReorderCSV)
            }
          >
            Download Report
          </button>
        </div>

        <div className="bg-white rounded-lg p-6 min-w-0">
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

      <DownloadModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        reportType={modalState.reportType}
      />
    </div>
  );
}
