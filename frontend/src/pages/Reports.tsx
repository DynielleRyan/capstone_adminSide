import { useReportsData } from "../hooks/useReportsData";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  } = useReportsData();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-700">REPORTS</h1>

      {/* Row 1: Chart + Top table side-by-side */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Total Transactions Card */}
        <div className="bg-base-100 rounded-xl p-4 shadow flex-1 min-w-0">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-lg">Total Transaction per</h2>
            <div className="flex items-center gap-2">
              <select
                className="select select-bordered select-sm"
                value={mode}
                onChange={(e) => setMode(e.target.value as "month" | "year")}
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

              <button className="btn btn-link" onClick={downloadChartCSV}>
                Download Report
              </button>
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

        {/* Top Selling Card */}
        <div className="bg-base-100 rounded-xl p-4 shadow flex-1 min-w-0">
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
              <button className="btn btn-link" onClick={downloadTopCSV}>
                Download Report
              </button>
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

      {/* Row 2: Reorder Level */}
      <div className="bg-base-100 rounded-xl p-4 shadow min-w-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-lg">
            Reorder Level for Low on Stock
          </h2>
          <button className="btn btn-link" onClick={downloadReorderCSV}>
            Download Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Current Qty</th>
                <th>Reorder Level</th>
                <th>Status</th>
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
                    <td>
                      <span
                        className={`badge ${
                          r.status === "LOW STOCK"
                            ? "badge-error"
                            : "badge-success"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
