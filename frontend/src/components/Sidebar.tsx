import { NavLink } from "react-router-dom";
import {
  Home,
  BarChart3,
  Receipt,
  Users,
  Factory,
  FileText,
} from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-base-300 p-4 flex flex-col fixed">
      <h2 className="text-xl font-bold mb-6 text-blue-700">Jambo's Pharmacy</h2>
      <ul className="menu text-base">
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100 font-bold " : undefined
            }
          >
            <span className="flex items-center gap-2">
              <Home size={18} />
              Dashboard
            </span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100 font-bold" : undefined
            }
          >
            <span className="flex items-center gap-2">
              <BarChart3 size={18} />
              Reports
            </span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100  font-bold" : undefined
            }
          >
            <span className="flex items-center gap-2">
              <Receipt size={18} />
              Transactions
            </span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100  font-bold" : undefined
            }
          >
            <span className="flex items-center gap-2">
              <Users size={18} />
              User Management
            </span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/suppliers"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100  font-bold" : undefined
            }
          >
            <span className="flex items-center gap-2">
              <Factory size={18} />
              Suppliers
            </span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/purchase"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100 font-bold" : undefined
            }
          >
            <span className="flex items-center gap-2">
              <FileText size={18} />
              Purchase Order
            </span>
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
