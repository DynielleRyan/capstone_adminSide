import api from './api';
import { PurchaseOrder } from '../types/purchaseOrder';
import { PurchaseOrderForms } from '../types/PurchaseOrderForms';

export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const response = await api.get('/purchase-orders');
  return response.data;
};


export const createPurchaseOrder = async (purchaseorder: PurchaseOrderForms) => {
  const response = await api.post('/purchase-orders', purchaseorder);
  return response.data;
};

export const fetchPurchaseOrderById = async (id: string) => {
  const response = await api.get(`/purchase-orders/${id}`);
  return response.data;
};

export const updatePurchaseOrder = async (id: string, purchaseorder: PurchaseOrderForms) => {
  const response = await api.put(`/purchase-orders/${id}`, purchaseorder);
  return response.data;
};
