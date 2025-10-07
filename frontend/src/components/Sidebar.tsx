import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3 
} from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <div className="drawer-side">
      <label htmlFor="drawer-toggle" aria-label="close sidebar" className="drawer-overlay"></label>
      <aside className="min-h-full w-64 bg-base-100">
        <div className="p-4">
          <h2 className="text-lg font-bold text-primary">Pharmacy Admin</h2>
        </div>
        <ul className="menu p-4 w-full">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link 
                  to={item.path}
                  className={`flex items-center gap-3 ${
                    isActive ? 'active' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}

export default Sidebar
