import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  Users, 
  ShoppingCart,
  Truck,
  ChevronRight
} from 'lucide-react'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, hasChevron: false },
    { path: '/reports', label: 'Report', icon: FileText, hasChevron: false },
    { path: '/transactions', label: 'Transactions', icon: CreditCard, hasChevron: false },
    { path: '/users', label: 'User Management', icon: Users, hasChevron: true },
    { path: '/suppliers', label: 'Suppliers', icon: ShoppingCart, hasChevron: true },
    { path: '/purchase-orders', label: 'Purchase Order', icon: Truck, hasChevron: false },
  ]

  return (
    <aside className="sidebar-container">
      <div>
        <h2 className="sidebar-title">Jambo's Pharmacy</h2>
      </div>
      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <li key={item.path} className="sidebar-menu-item">
              <Link 
                to={item.path}
                className={`sidebar-menu-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="sidebar-menu-icon" />
                <span className="sidebar-menu-text">{item.label}</span>
                {item.hasChevron && (
                  <ChevronRight className="sidebar-menu-chevron" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

export default Sidebar
