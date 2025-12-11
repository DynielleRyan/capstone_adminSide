import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Edit3, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import alertService from "../services/alertService";
import {
  userService,
  UserResponse,
  UserFilters,
} from "../services/userService";
import { useAuth } from "../hooks/useAuth";
import { Permissions } from "../utils/permissions";

const RoleManagement = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [copiedUserIDs, setCopiedUserIDs] = useState<Set<string>>(new Set());

  // Fetch users from API
  const fetchUsers = useCallback(
    async (page = 1, search?: string) => {
      try {
        setLoading(true);
        setError(null);

        const filters: UserFilters = {
          page,
          limit: 10, // Display 10 items per page
          search: search || undefined,
        };

        const response = await userService.getUsers(filters);

        if (response.success && response.data) {
          setUsers(response.data.users);
          setCurrentPage(response.data.page);
          setTotalPages(response.data.totalPages);
          setTotalUsers(response.data.total);
        } else {
          setError(response.message || "Failed to fetch users");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // If search term is empty, fetch all users
      // Otherwise, fetch with search term
      fetchUsers(1, searchTerm || undefined);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchUsers]);

  // Filter and sort users based on search term and sort criteria
  const filteredUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      const fullName = `${user.FirstName} ${user.LastName}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      // Helper function for role filtering
      const roleString =
        user.Roles === "Pharmacist"
          ? "pharmacist"
          : user.Roles === "Clerk"
          ? "clerk"
          : "pharmacist";
      return (
        fullName.includes(searchLower) ||
        user.Username.toLowerCase().includes(searchLower) ||
        roleString.includes(searchLower)
      );
    });

    if (sortBy !== "none") {
      filtered = filtered.sort((a, b) => {
        switch (sortBy) {
          case "name":
            const nameA = `${a.FirstName} ${a.MiddleInitial || ""} ${
              a.LastName
            }`
              .trim()
              .toLowerCase();
            const nameB = `${b.FirstName} ${b.MiddleInitial || ""} ${
              b.LastName
            }`
              .trim()
              .toLowerCase();
            return nameA.localeCompare(nameB);

          case "role":
            return a.Roles.localeCompare(b.Roles);

          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [users, searchTerm, sortBy]);

  // Copy user ID to clipboard
  const copyUserID = async (userID: string) => {
    try {
      await navigator.clipboard.writeText(userID);
      setCopiedUserIDs(prev => new Set(prev).add(userID));
      setTimeout(() => {
        setCopiedUserIDs(prev => {
          const next = new Set(prev);
          next.delete(userID);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Blue background div */}
      <div className="p-6 bg-blue-50 rounded-lg">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">MANAGE ROLES</h1>

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
                <option value="role">Role</option>
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
          {Permissions.canCreateUser() && (
            <button
              onClick={() => navigate("/role-management/add")}
              className="bg-blue-900 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              ADD USER
            </button>
          )}
          {Permissions.canUpdateUser() && (
            <button
              onClick={() => {
                if (loading) {
                  alertService.warning(
                    "Please wait for users to load before editing."
                  );
                  return;
                }
                if (users.length === 0) {
                  alertService.info(
                    "No users available to edit. Please add users first."
                  );
                  return;
                }
                navigate("/role-management/edit");
              }}
              disabled={loading || users.length === 0}
              className="border border-blue-900 text-blue-900 px-6 py-2 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit3 className="w-4 h-4" />
              EDIT USER
            </button>
          )}
          {!isAdmin && (
            <div className="text-sm text-gray-500 flex items-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Admin-only features are restricted
            </div>
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
                <th className="px-6 py-4 text-center font-semibold border-r border-white">USER ID</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">NAME</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">CONTACT</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">USERNAME</th>
                <th className="px-6 py-4 text-center font-semibold border-r border-white">ROLE</th>
              </tr>
            </thead>
            <tbody className=" bg-blue-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-red-500"
                  >
                    Error: {error}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.UserID}
                  >
                    <td className="px-6 py-4 text-gray-700 text-center border border-white font-mono text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <span>{user.UserID}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyUserID(user.UserID || '');
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copy User ID"
                        >
                          {copiedUserIDs.has(user.UserID || '') ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-600 hover:text-blue-600" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {user.FirstName} {user.MiddleInitial} {user.LastName}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      {user.ContactNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">{user.Username}</td>
                    <td className="px-6 py-4 text-gray-700 text-center border border-white">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.Roles === "Pharmacist"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.Roles.toUpperCase()}
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

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing {filteredUsers.length} of {totalUsers} users
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => fetchUsers(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
