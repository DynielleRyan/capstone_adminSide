import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ConfirmDialog from './components/ConfirmDialog'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
// import Customers from './pages/Customers'
import Reports from './pages/Reports'
import RoleManagement from './pages/RoleManagement'
import Suppliers from './pages/Suppliers'
import ProductSourceList from './pages/ProductSourceList'
import UserProfile from './pages/UserProfile'
import Login from './pages/Login'
import alertService from './services/alertService'
import { Transactions } from './pages/Transactions'
import { PurchaseOrders } from './pages/PurchaseOrder'
import { NewPurchaseOrder } from './pages/NewPurchaseOrder'
import { UpdatePurchaseOrder } from './pages/UpdatePurchaseOrder'

function App() {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    message: string
    title?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    onConfirm: () => void
    onCancel: () => void
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  })

  // Set up the confirm handler for alertService
  useEffect(() => {
    alertService.setConfirmHandler((message, options) => {
      return new Promise((resolve) => {
        setConfirmDialog({
          isOpen: true,
          message,
          title: options?.title,
          confirmText: options?.confirmText,
          cancelText: options?.cancelText,
          variant: options?.variant,
          onConfirm: () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            resolve(true)
          },
          onCancel: () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            resolve(false)
          }
        })
      })
    })
  }, [])

  return (
    <Router>
      {/* Toast Container - place it once in your app */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        title={confirmDialog.title}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />

      <Routes>
        {/* Login route without Layout */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes with Layout */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/role-management" element={<RoleManagement />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/product-source-list" element={<ProductSourceList />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/purchase-orders/new" element={<NewPurchaseOrder />} />
                <Route path="/purchase-orders/:id" element={<UpdatePurchaseOrder />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App
