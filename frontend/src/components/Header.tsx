import { useState, useEffect } from "react";
import {
  Bell,
  User,
  Search,
  LogOut,
  UserCircle,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { UserResponse } from "../services/userService";
import {
  getNotificationCounts,
  getNotificationLists,
  type LowStockItem,
  type ExpiringBatch,
} from "../services/notificationServices";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  //  Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
  const [lowCount, setLowCount] = useState(0);
  const [expCount, setExpCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);

  // Load user from localStorage
  useEffect(() => {
    const storedUser = authService.getStoredUser();
    if (storedUser) setUser(storedUser);
  }, []);

  const handleProfileClick = () => {
    setShowDropdown(false);
    navigate("/profile");
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    return `${user.FirstName} ${user.LastName}`;
  };

  // =====================
  // 🔔 Notification logic
  // =====================

  // Fetch counts for the badge
  async function loadNotifCounts() {
    try {
      const { lowCount, expTotal } = await getNotificationCounts();
      setLowCount(lowCount);
      setExpCount(expTotal);
    } catch (err) {
      console.error("Notif count error:", err);
    }
  }

  // Fetch item details for dropdown
  async function loadNotifList() {
    setLoadingNotif(true);
    try {
      const { lowList, expList } = await getNotificationLists();
      setLowStock(lowList);
      setExpiring(expList);
    } catch (err) {
      console.error("Notif list error:", err);
    } finally {
      setLoadingNotif(false);
    }
  }

  useEffect(() => {
    loadNotifCounts();
    const interval = setInterval(loadNotifCounts, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const badgeCount = lowCount + expCount;

  // When user opens the notification bell
  const toggleNotif = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      await loadNotifList();
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 relative">
      <div className="flex items-center justify-between">
        {/* Pharmacy Name */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-blue-600">Jambo's Pharmacy</h1>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search here..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right side icons */}
        <div className="flex items-center gap-4">
          {/* 🔔 Notification Bell */}
          <div className="relative">
            <button
              onClick={toggleNotif}
              className="p-2 hover:bg-gray-100 rounded-full relative"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 max-h-[400px] overflow-y-auto bg-white border rounded-xl shadow-lg z-50">
                <div className="p-3 font-semibold border-b">Notifications</div>
                {loadingNotif && (
                  <div className="p-3 text-sm text-gray-500">Loading…</div>
                )}
                {!loadingNotif && (
                  <div className="divide-y text-sm">
                    {/* Low Stock */}
                    {lowStock.length > 0 && (
                      <div className="p-3">
                        <div className="text-xs font-semibold mb-2 uppercase text-gray-500">
                          Low Stock
                        </div>
                        {lowStock.map((item) => (
                          <div key={item.productId} className="mb-2">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-600">
                              Quantity: {item.qty}{" "}
                              {item.expiry &&
                                `| Earliest Expiry: ${item.expiry}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expiring Soon */}
                    {expiring.length > 0 && (
                      <div className="p-3">
                        <div className="text-xs font-semibold mb-2 uppercase text-gray-500">
                          Expiring Soon
                        </div>
                        {expiring.map((batch) => (
                          <div key={batch.productItemId} className="mb-2">
                            <div className="font-medium flex items-center gap-1">
                              {batch.expiryLevel === "danger" && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                              {batch.productName}
                            </div>
                            <div className="text-xs text-gray-600">
                              Expires on: {batch.expiryDate} | Days left:{" "}
                              {batch.daysLeft} | Qty: {batch.qty}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* If nothing */}
                    {lowStock.length === 0 && expiring.length === 0 && (
                      <div className="p-3 text-gray-500 text-sm">
                        No notifications 🎉
                      </div>
                    )}
                  </div>
                )}
                <div className="p-2 border-t text-right">
                  <button
                    onClick={loadNotifList}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 👤 User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
            >
              <div className="p-2 bg-gray-100 rounded-full">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-gray-700 font-medium">
                {getUserDisplayName()}
              </span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleProfileClick}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>View Profile</span>
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showDropdown || notifOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false);
            setNotifOpen(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
