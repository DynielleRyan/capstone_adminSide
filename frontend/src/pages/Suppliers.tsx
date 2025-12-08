import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import SupplierDetailsModal from "../components/SupplierDetailsModal";
import {
  supplierService,
  SupplierResponse,
  SupplierFilters,
} from "../services/supplierService";
import { Permissions } from "../utils/permissions";

const Suppliers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [isSupplierDetailsOpen, setIsSupplierDetailsOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSuppliers, setTotalSuppliers] = useState(0);

  // Fetch suppliers from API
  const fetchSuppliers = useCallback(
    async (page = 1, search?: string) => {
      try {
        setLoading(true);
        setError(null);

        const filters: SupplierFilters = {
          page,
          limit: 10, // Display 10 items per page
          search: search || undefined,
        };

        const response = await supplierService.getSuppliers(filters);

        if (response.success && response.data) {
          setSuppliers(response.data.suppliers);
          setCurrentPage(response.data.page);
          setTotalPages(response.data.totalPages);
          setTotalSuppliers(response.data.total);
        } else {
          setError(response.message || "Failed to fetch suppliers");
        }
      } catch (err) {
        console.error("Error fetching suppliers:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch suppliers"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // If search term is empty, fetch all suppliers
      // Otherwise, fetch with search term
      fetchSuppliers(1, searchTerm || undefined);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchSuppliers]);

  // Filter and sort suppliers based on search term and sort criteria
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers.filter((supplier) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        supplier.Name.toLowerCase().includes(searchLower) ||
        supplier.ContactPerson?.toLowerCase().includes(searchLower) ||
        supplier.Email?.toLowerCase().includes(searchLower)
      );
    });

    if (sortBy !== "none") {
      filtered = filtered.sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.Name.toLowerCase().localeCompare(b.Name.toLowerCase());
          case "status":
            return (a.IsActiveYN ? "active" : "inactive").localeCompare(
              b.IsActiveYN ? "active" : "inactive"
            );
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [suppliers, searchTerm, sortBy]);

  // Format supplier ID to show a shortened version of the UUID
  const formatSupplierId = (supplierId: string) => {
    if (!supplierId) return "N/A";
    // Take the first 8 characters of the UUID and format as S-XXXX
    const shortId = supplierId.substring(0, 8).toUpperCase();
    return `S-${shortId}`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">SUPPLIERS</h1>

        {/* Sort, Search, and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="None"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
          {Permissions.canCreateSupplier() && (
            <button
              onClick={() => navigate("/suppliers/add")}
              className="bg-blue-900 font-semibold text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              ADD SUPPLIER
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">
                  SUPPLIER ID
                </th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">NAME</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">
                  CONTACT PERSON
                </th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">
                  CONTACT NUMBER
                </th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">STATUS</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">ACTION</th>
              </tr>
            </thead>
            <tbody className=" bg-blue-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading suppliers...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-red-500"
                  >
                    Error: {error}
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No suppliers found
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.SupplierID}
                  >
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {formatSupplierId(supplier.SupplierID!)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{supplier.Name}</td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {supplier.ContactPerson || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {supplier.ContactNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 border text-center border-white">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          supplier.IsActiveYN
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {supplier.IsActiveYN ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-4 border border-white">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedSupplierId(supplier.SupplierID!);
                            setIsSupplierDetailsOpen(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {Permissions.canUpdateSupplier() && (
                          <button
                            onClick={() => {
                              navigate("/suppliers/edit", {
                                state: { supplier },
                              });
                            }}
                            className="text-green-500 hover:text-green-700 transition-colors"
                            title="Edit supplier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {filteredSuppliers.length} of {totalSuppliers} suppliers
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSuppliers(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => fetchSuppliers(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Supplier Details Modal */}
      <SupplierDetailsModal
        isOpen={isSupplierDetailsOpen}
        onClose={() => {
          setIsSupplierDetailsOpen(false);
          setSelectedSupplierId(null);
        }}
        supplierId={selectedSupplierId}
      />
    </div>
  );
};

export default Suppliers;
