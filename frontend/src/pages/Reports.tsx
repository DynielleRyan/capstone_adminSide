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

// ==== MODAL COMPONENT FOR DOWNLOAD CONFIRMATION ====
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
    <div className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirm Download</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to download the {reportType} report as CSV?
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
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
  );
}

export default function Reports() {
  const {
    // ====controls====
    mode,
    setMode,
    thisYear,
    year,
    setYear,
    type,
    setType,
    limit,
    setLimit,
    // ====data====
    topItems,
    reorder,
    chartData,
    // ====loading flags=====
    loadingChart,
    loadingTop,
    loadingReorder,
    // ====actions====
    downloadChartCSV,
    downloadTopCSV,
    downloadReorderCSV,
    // modal handlers
    modalState,
    openDownloadModal,
    closeModal,
  } = report_hooks();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-700">REPORTS</h1>

      {/* Chart + Top table side-by-side */}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Total Transactions Card */}
        <div className="card  flex-1">
          <button
            className="btn btn-link justify-end text-blue-700"
            style={{ textDecoration: "none" }}
            onClick={() =>
              openDownloadModal("Transaction Chart", downloadChartCSV)
            }
          >
            Download Report
          </button>

          <div className="bg-base-300 rounded-xl p-4 shadow min-w-0">
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
                  <BarChart data={chartData as any[]}>
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
        {/* Top Selling Card */}
        <div className="card  flex-1">
          <button
            className="btn btn-link justify-end text-blue-700"
            style={{ textDecoration: "none" }}
            onClick={() => openDownloadModal("Top Selling", downloadTopCSV)}
          >
            Download Report
          </button>
          <div className="bg-base-300 rounded-xl p-4 shadow flex-1 min-w-0">
            <div className="flex justify-between items-center mb-3">
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

            <div className="overflow-x-auto">
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
                  ) : topItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center opacity-60">
                        No data
                      </td>
                    </tr>
                  ) : (
                    topItems.map((item, i) => (
                      <tr key={`${item.name}-${i}`}>
                        <td>{i + 1}</td>
                        <td>
                          {type === "product"
                            ? item.name ?? "Unknown Product"
                            : item.category ?? "Uncategorized"}
                        </td>
                        <td>{item.sold}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Reorder Level */}
      <div className="card">
        <button
          className="btn btn-link justify-end text-blue-700"
          style={{ textDecoration: "none" }}
          onClick={() => openDownloadModal("Reorder Level", downloadReorderCSV)}
        >
          Download Report
        </button>
        <div className="bg-base-300 rounded-xl p-4 shadow min-w-0">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-lg">
              Reorder Level for Low on Stock
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Current Qty</th>
                  <th>Reorder Level</th>
                  <th>Suggested Reorder Qty</th>
                  {/* <th>Status</th> */}
                </tr>
              </thead>
              <tbody>
                {loadingReorder ? (
                  <tr>
                    <td colSpan={4} className="text-center opacity-60">
                      Loading...
                    </td>
                  </tr>
                ) : reorder.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center opacity-60">
                      No low stock
                    </td>
                  </tr>
                ) : (
                  reorder.map((r) => (
                    <tr key={r.productId}>
                      <td>{r.name}</td>
                      <td>{r.totalStock}</td>
                      <td>{r.reorderLevel}</td>
                      <td>{r.reorderQuantity}</td>
                      {/* <td>
                        <span
                          className={`badge ${
                            r.status === "LOW STOCK"
                              ? "badge-error"
                              : "badge-success"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==== DOWNLOAD CONFIRMATION MODAL ==== */}
      <DownloadModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        reportType={modalState.reportType}
      />
    </div>
  );
}
