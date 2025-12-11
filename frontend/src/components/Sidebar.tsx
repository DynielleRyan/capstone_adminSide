import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { useAuth } from "../hooks/useAuth";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPharmacist } = useAuth();

  // Pharmacist menu items
  const pharmacistMenuItems = [
    { path: "/pharmacist/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      path: "/pharmacist/products",
      label: "Products",
      icon: Package,
      children: [
        { path: "/pharmacist/products/list", label: "Product List", icon: Package },
        { path: "/pharmacist/products/upload", label: "Product Upload", icon: Package },
      ],
    },
  ];

  // Admin/Clerk menu items (default)
  const adminMenuItems = [
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

  // Select menu items based on user role
  const menuItems = isPharmacist ? pharmacistMenuItems : adminMenuItems;

  return (
    <aside className="w-64 bg-blue-50 border-r border-blue-50 h-full">
      <div className="p-4">
        <h2 
          className="text-lg font-bold text-blue-600 text-center cursor-pointer hover:text-blue-800 transition-colors"
          onClick={() => navigate(isPharmacist ? "/pharmacist/dashboard" : "/")}
        >
          Jambo's Pharmacy
        </h2>
      </div>
      <ul className="p-4 w-full space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.children &&
              item.children.some((child) => location.pathname === child.path));

          if (item.children) {
            // Determine navigation path: for Suppliers, go to parent; for others, go to first child
            const navigationPath = item.path === "/suppliers" 
              ? item.path 
              : item.children[0].path;

            return (
              <li key={item.path}>
                <details open={isActive}>
                  <summary
                    className={`flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-blue-100 ${
                      isActive ? "bg-blue-100 text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <Link
                      to={navigationPath}
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