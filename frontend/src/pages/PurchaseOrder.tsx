import { useEffect, useState } from 'react';
import { fetchPurchaseOrders } from '../services/purchaseOrderService';
import { PurchaseOrder } from '../types/purchaseOrder';
import { PurchaseOrderTable } from '../components/purchaseOrderTable';

export const PurchaseOrders = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    fetchPurchaseOrders().then(setOrders);
  }, []);

  return <PurchaseOrderTable orders={orders} />;
    
};
