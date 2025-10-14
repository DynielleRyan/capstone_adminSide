import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-base-100 p-4 flex flex-col fixed">
      <h2 className="text-xl font-bold mb-6 text-blue-700">Jambo's Pharmacy</h2>
      <ul className="menu text-base">
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100 font-bold " : undefined
            }
          >
            🏠 Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100 font-bold" : undefined
            }
          >
            📊 Reports
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100  font-bold" : undefined
            }
          >
            💰 Transactions
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100  font-bold" : undefined
            }
          >
            👥 User Management
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/suppliers"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100  font-bold" : undefined
            }
          >
            🏭 Suppliers
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/purchase"
            className={({ isActive }) =>
              isActive ? "active bg-blue-100 font-bold" : undefined
            }
          >
            🧾 Purchase Order
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
