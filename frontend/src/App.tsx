import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Transactions } from './pages/Transactions';
import { PurchaseOrders } from './pages/PurchaseOrder';
import { NewPurchaseOrder } from './pages/NewPurchaseOrder';
import { UpdatePurchaseOrder } from './pages/UpdatePurchaseOrder';
import Sidebar from './components/Sidebar';

function App() {

  return (
    <Router>
      <div>
        {/* Sidebar always visible */}
        <Sidebar />

        <div className="min-h-screen bg-base-200" style={{ marginLeft: '256px' }}>
          <Routes>
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/purchase-orders/new" element={<NewPurchaseOrder />} />
            <Route path="/purchase-orders/:id" element={<UpdatePurchaseOrder />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
