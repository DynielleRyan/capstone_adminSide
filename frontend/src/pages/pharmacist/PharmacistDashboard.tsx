import { useState } from "react";
import { useDashboard } from "../../hooks/dashboard_hooks";
import { ArrowLeft, Copy, Check } from "lucide-react";

const PharmacistDashboard = () => {
  const {
    currency,
    lowCount,
    expiringTotal,
    lowRows,
    expRows,
    loadingLow,
    loadingExp,
    openLowModal,
    openExpModal,
    open,
    setOpen,
    generateLowReport,
    generateExpReport,
    lowStockPreviewData,
    confirmDownloadLowReport,
    closeLowStockPreview,
    expiringPreviewData,
    confirmDownloadExpReport,
    closeExpiringPreview,
  } = useDashboard({ preloadLists: true });

  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  // 🧩 Handlers
  const handleOpenLow = async () => {
    await openLowModal();
  };

  const handleOpenExp = async () => {
    await openExpModal();
  };

  const handleClose = () => setOpen(null);

  const handleGenerateReport = () => {
    if (open === "low") generateLowReport();
    if (open === "exp") generateExpReport();
  };

  // Copy ID to clipboard
  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        setCopiedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  //  Limit visible rows in dashboard only
  const limit = 7;

  return (
    <div className="p-6 space-y-8">
      {/* ========================= */}
      {/* Expiring Products Section */}
      {/* ========================= */}
      <div className="bg-white rounded-lg shadow border h-auto">
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
            className="text-blue-600 font-semibold hover:underline"
            onClick={handleOpenExp}
          >
            Generate Report
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[80vh]">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-4 py-4 text-center font-semibold border-r border-white">ID</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Product</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Category</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Brand</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Expiry</th>
                <th className="px-6 py-4 text-center font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody className=" bg-gray-100">
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
                expRows.slice(0, limit).map((r, _i) => (
                  <tr
                    key={r.productItemId}
                  >
                    <td className="px-6 py-4 text-gray-700 border border-white text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{r.productId}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyId(r.productId);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copy Product ID"
                        >
                          {copiedIds.has(r.productId) ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-600 hover:text-blue-600" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{r.productName}</td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{r.category}</td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{r.brand}</td>
                    <td className="px-6 py-4 text-center border border-white">
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
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{r.qty ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================= */}
      {/* Low on Stock Section */}
      {/* ========================= */}
      <div className="bg-white rounded-lg shadow border h-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Low on Stock (≤ 20)
            {typeof lowCount === "number" ? ` · ${lowCount}` : ""}
          </h3>
          <button
            className="text-blue-600 font-semibold hover:underline"
            onClick={handleOpenLow}
          >
            Generate Report
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[80vh]">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-4 py-4 text-center font-semibold border-r border-white">ID</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Product</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Category</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Brand</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Price</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">Expiry</th>
                <th className="px-6 py-4 text-center font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody className=" bg-gray-100">
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
                lowRows.slice(0, limit).map((r, _index) => (
                  <tr
                    key={r.productId}
                  >
                    <td className="px-6 py-4 text-gray-700 border border-white text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{r.productId}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyId(r.productId);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copy Product ID"
                        >
                          {copiedIds.has(r.productId) ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-600 hover:text-blue-600" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      <div className="flex items-center text-center gap-2">
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
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{r.category}</td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{r.brand}</td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {currency}
                      {(r.price ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {r.expiry ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{r.qty ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================= */}
      {/* Custom Modal */}
      {/* ========================= */}
      {open && (
        <div className="">
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-4/5 lg:w-3/4 max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
              {/* ===== Header ===== */}
              <div className="flex justify-between items-center px-8 py-5 border-b bg-gray-50">
                <button
                  onClick={handleClose}
                  className="flex items-center gap-3 text-gray-600 hover:text-blue-700 transition-colors px-3 py-2 rounded-md"
                >
                  <ArrowLeft size={34} strokeWidth={2.5} />
                </button>

                {/* <h2 className="flex-1 text-center text-lg font-semibold text-blue-900">
                  {modalTitle}
                </h2> */}

                <button
                  onClick={handleGenerateReport}
                  className="text-blue-700 font-semibold text-sm hover:underline px-3"
                >
                  Generate Report
                </button>
              </div>

              {/* ===== Legend (Expiring Only) ===== */}
              {open === "exp" && (
                <div className="bg-blue-50 py-3 border-b flex justify-center">
                  <div className="flex items-center gap-8 text-sm font-medium text-gray-800">
                    <span className="text-blue-900 font-bold">LEGEND</span>
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-5 h-4 rounded bg-yellow-300" />
                      <span>Yellow = 6 months</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-5 h-4 rounded bg-red-400" />
                      <span>Red = 3 months</span>
                    </span>
                  </div>
                </div>
              )}

              {/* ===== Scrollable Content ===== */}
              <div className="overflow-auto p-6 flex-1">
                {/* ========================== */}
                {/* LOW ON STOCK MODAL VIEW */}
                {/* ========================== */}
                {open === "low" && (
                  <>
                    {loadingLow ? (
                      <p className="text-center py-6 text-gray-500">
                        Loading low stock...
                      </p>
                    ) : (
                      <div className="border border-blue-200 rounded-md overflow-hidden p-4">
                        {/* Title Row */}
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-gray-900">
                            Low on Stock (≤ 20)
                            {typeof lowCount === "number"
                              ? `  ·  ${lowCount}`
                              : ""}
                          </h3>
                        </div>

                        {/* Table */}
                        <table className="w-full text-sm border-collapse">
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
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {lowRows.map((r, i) => (
                              <tr
                                key={r.productId}
                                className={`${
                                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }`}
                              >
                                <td className="px-6 py-3 text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <span>{r.productId}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyId(r.productId);
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                                      title="Copy Product ID"
                                    >
                                      {copiedIds.has(r.productId) ? (
                                        <Check className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-gray-600 hover:text-blue-600" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {r.name}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {r.category}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {r.brand}
                                </td>
                                <td className="px-6 py-3 font-semibold text-gray-800">
                                  {r.qty ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* ========================== */}
                {/* EXPIRING PRODUCTS MODAL VIEW */}
                {/* ========================== */}
                {open === "exp" && (
                  <>
                    {loadingExp ? (
                      <p className="text-center py-6 text-gray-500">
                        Loading expiring products...
                      </p>
                    ) : (
                      <div className="border border-blue-200 rounded-md overflow-hidden p-4">
                        {/* Title Row */}
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-gray-900">
                            Expiring Products
                            {typeof expiringTotal === "number"
                              ? `  ·  ${expiringTotal}`
                              : ""}
                          </h3>
                        </div>

                        {/* Table */}
                        <table className="w-full text-sm border-collapse table-fixed">
                          <thead className="bg-blue-900 text-white">
                            <tr>
                              <th className="px-6 py-3 text-left font-semibold w-[14%]">
                                ID
                              </th>
                              <th className="px-6 py-3 text-left font-semibold w-[22%]">
                                Product
                              </th>
                              <th className="px-6 py-3 text-left font-semibold w-[18%]">
                                Category
                              </th>
                              <th className="px-6 py-3 text-left font-semibold w-[18%]">
                                Brand
                              </th>
                              <th className="px-6 py-3 text-left font-semibold w-[15%]">
                                Expiry
                              </th>
                              <th className="px-6 py-3 text-left font-semibold w-[10%]">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {expRows.map((r, i) => (
                              <tr
                                key={r.productItemId}
                                className={`${
                                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                                } hover:bg-blue-50`}
                              >
                                <td className="px-6 py-3 text-gray-700 max-w-[140px] truncate">
                                  <div className="flex items-center gap-2">
                                    <span>{r.productId}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyId(r.productId);
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                      title="Copy Product ID"
                                    >
                                      {copiedIds.has(r.productId) ? (
                                        <Check className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-gray-600 hover:text-blue-600" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {r.productName}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {r.category}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {r.brand}
                                </td>
                                <td className="px-6 py-3">
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
                                <td className="px-6 py-3 text-gray-800 font-semibold">
                                  {r.qty}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Report Preview Modal */}
      <ReportPreviewModal
        isOpen={lowStockPreviewData.isOpen}
        onClose={closeLowStockPreview}
        onConfirm={confirmDownloadLowReport}
        data={lowStockPreviewData.rows}
        filename={lowStockPreviewData.filename}
        title="Low Stock Report Preview"
      />

      {/* Expiring Products Report Preview Modal */}
      <ReportPreviewModal
        isOpen={expiringPreviewData.isOpen}
        onClose={closeExpiringPreview}
        onConfirm={confirmDownloadExpReport}
        data={expiringPreviewData.rows}
        filename={expiringPreviewData.filename}
        title="Expiring Products Report Preview"
      />
    </div>
  );
};

// Report Preview Modal Component
function ReportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  data,
  filename,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: any[];
  filename: string;
  title: string;
}) {
  if (!isOpen) return null;

  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const previewRows = data.slice(0, 50);
  const hasMore = data.length > 50;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
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
          {data.length === 0 ? (
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
            disabled={data.length === 0}
          >
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default PharmacistDashboard;
