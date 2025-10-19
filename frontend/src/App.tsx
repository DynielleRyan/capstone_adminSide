import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Reports from "./pages/Reports";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Suppliers from "./pages/Suppliers";
import PurchaseOrder from "./pages/PurchaseOrder";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-base-200 overflow-x-hidden">
        {/* fixed left nav */}
        <aside className="fixed inset-y-0 left-0 w-64 bg-base-100 shadow z-20">
          <Sidebar />
        </aside>

        {/* right side = header + routed pages */}
        <main className="ml-64 flex flex-col min-h-screen">
          <Header />
          <div className="p-6 flex-1 bg-base-100">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/purchase-order" element={<PurchaseOrder />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
