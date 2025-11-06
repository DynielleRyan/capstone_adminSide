import { useState, useEffect } from "react";
import { Bell, User, Search, LogOut, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";

// ✅ Keep only these two
import {
  fetchNotifications,
  markNotificationsRead,
  triggerScan,
} from "../services/notificationServices";

const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔔 Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      severity: "info" | "warning" | "danger";
      created_at: string;
      is_read: boolean;
    }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);

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

  const getUserDisplayName = () =>
    !user ? "User" : `${user.FirstName} ${user.LastName}`;

  // =====================
  // 🔔 Notification logic
  // =====================
  async function loadNotifications() {
    try {
      setLoadingNotif(true);
      const { items, unread } = await fetchNotifications(); // GET /api/notifications

      const list = items ?? [];
      setNotifications(list);

      // Fallback: if server sends 0, compute from the list
      const computed = list.filter((n) => !n.is_read).length;
      setUnreadCount(unread ?? computed);
    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setLoadingNotif(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (!ids.length) return;

      await markNotificationsRead(ids); // PATCH /api/notifications/read
      // re-fetch to recompute the unread count and list
      await loadNotifications();
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  }

  async function handleRefresh() {
    try {
      setLoadingNotif(true);
      await triggerScan();
      await loadNotifications(); // ✅ just reload
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setLoadingNotif(false);
    }
  }

  useEffect(() => {
    loadNotifications(); // initial load
    const id = setInterval(loadNotifications, 60_000); // auto refresh every 60s
    return () => clearInterval(id);
  }, []);

  const toggleNotif = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) await loadNotifications();
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
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 max-h-[420px] overflow-y-auto bg-white border rounded-xl shadow-lg z-50">
                <div className="p-3 font-semibold border-b flex items-center justify-between">
                  <span>Notifications</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mark all as read
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {loadingNotif && (
                  <div className="p-3 text-sm text-gray-500">Loading…</div>
                )}

                {!loadingNotif && notifications.length === 0 && (
                  <div className="p-3 text-gray-500 text-sm">
                    No notifications 🎉
                  </div>
                )}

                {!loadingNotif && notifications.length > 0 && (
                  <div className="divide-y text-sm">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 ${
                          !n.is_read ? "bg-blue-50" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <div className="font-medium text-gray-800">
                          {n.title}
                        </div>
                        <div className="text-xs text-gray-600">{n.message}</div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
