import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Transactions } from './pages/Transactions';
import { PurchaseOrders } from './pages/PurchaseOrder';
import { NewPurchaseOrder } from './pages/NewPurchaseOrder';
import { UpdatePurchaseOrder } from './pages/UpdatePurchaseOrder';

function App() {

  return (
    <Router>
      <div className="min-h-screen bg-base-200">
        <Routes>
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/purchase-orders/new" element={<NewPurchaseOrder />} />
          <Route path="/purchase-orders/:id" element={<UpdatePurchaseOrder />} />

        </Routes>
      </div>
    </Router>
  )
}

export default App
