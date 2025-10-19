import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
// import Customers from './pages/Customers'
import Reports from './pages/Reports'
import RoleManagement from './pages/RoleManagement'
import Suppliers from './pages/Suppliers'
import ProductSourceList from './pages/ProductSourceList'
import UserProfile from './pages/UserProfile'
import Login from './pages/Login'

function App() {
  return (
    <Router>
      <Routes>
        {/* Login route without Layout */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes with Layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/role-management" element={<RoleManagement />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/product-source-list" element={<ProductSourceList />} />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  )
}

export default App
