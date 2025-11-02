import { useDashboard } from "../../hooks/dashboard_hooks";

const PharmacistDashboard = () => {
  // Inline mode: preload the lists so they render immediately (no modals here)
  const {
    currency,

    // counts (optional to show)
    lowCount,
    expiringTotal,

    // lists
    lowRows,
    expRows,
    loadingLow,
    loadingExp,

    // csv + optional refresh
    downloadLowCSV,
    downloadExpCSV,
    refreshLists,
  } = useDashboard({ preloadLists: true });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">
            Pharmacist Dashboard
          </h1>
        </div>
        <button
          className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors"
          onClick={refreshLists}
        >
          Refresh Data
        </button>
      </div>

      {/* Low on Stock (inline card) */}
      <div className="bg-white rounded-lg shadow border min-h-[90vh] ">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Low on Stock (≤ 20)
            {typeof lowCount === "number" ? ` · ${lowCount}` : ""}
          </h3>
          <button
            className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            onClick={downloadLowCSV}
          >
            Download CSV
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[80vh]  ">
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
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : (Array.isArray(lowRows) ? lowRows : []).length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No low stock
                  </td>
                </tr>
              ) : (
                (Array.isArray(lowRows) ? lowRows : []).map((r, index) => (
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
                    <td className="px-6 py-4 text-gray-700">{r.category}</td>
                    <td className="px-6 py-4 text-gray-700">{r.brand}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {currency}
                      {(r.price ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {r.expiry ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{r.qty ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Products (inline card) */}
      <div className="bg-white rounded-lg shadow border min-h-[90vh]">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Expiring Products
              {typeof expiringTotal === "number" ? ` · ${expiringTotal}` : ""}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-block w-4 h-4 rounded bg-yellow-300" />
              <span>6 months</span>
              <span className="inline-block w-4 h-4 rounded bg-red-400 ml-2" />
              <span>3 months</span>
            </div>
          </div>
          <button
            className="px-4 py-2 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            onClick={downloadExpCSV}
          >
            Download CSV
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[80vh]">
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
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : (Array.isArray(expRows) ? expRows : []).length === 0 ? (
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
  );
};

export default PharmacistDashboard;
