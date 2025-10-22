import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  // ShoppingCart,
  Users,
  // BarChart3,
  FileText,
  Receipt,
  UserCog,
  ChevronDown,
  ShoppingBag,
} from "lucide-react";
import "./Sidebar.css";

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/reports", label: "Report", icon: FileText },
    { path: "/transactions", label: "Transactions", icon: Receipt },
    {
      path: "/user-management",
      label: "User Management",
      icon: Users,
      children: [
        { path: "/role-management", label: "Role Management", icon: UserCog },
      ],
    },
    {
      path: "/suppliers",
      label: "Suppliers",
      icon: ShoppingBag,
      children: [
        {
          path: "/product-source-list",
          label: "Product Source List",
          icon: ShoppingBag,
        },
      ],
    },
    { path: "/purchase-orders", label: "Purchase Order", icon: Package },
  ];

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-full">
      <div className="p-4">
        <h2 className="text-lg font-bold text-blue-600">Jambo's Pharmacy</h2>
      </div>
      <ul className="p-4 w-full space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.children &&
              item.children.some((child) => location.pathname === child.path));

          if (item.children) {
            return (
              <li key={item.path}>
                <details open={isActive}>
                  <summary
                    className={`flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-blue-100 ${
                      isActive ? "bg-blue-100 text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <Link
                      to={item.path}
                      className="flex items-center gap-3 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  </summary>
                  <ul className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = location.pathname === child.path;
                      return (
                        <li key={child.path}>
                          <Link
                            to={child.path}
                            className={`flex items-center gap-3 p-2 rounded-md hover:bg-blue-100 ${
                              isChildActive
                                ? "bg-blue-100 text-blue-600"
                                : "text-gray-600"
                            }`}
                          >
                            <ChildIcon className="w-4 h-4" />
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          }

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 p-3 rounded-md hover:bg-blue-100 ${
                  isActive ? "bg-blue-100 text-blue-600" : "text-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default Sidebar;
