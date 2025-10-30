// src/services/notificationService.ts
const API_BASE = import.meta.env.VITE_API_URL; // example: "http://localhost:5001"

export interface LowStockItem {
  rowNo: number;
  productId: string;
  name: string;
  qty: number;
  expiry: string | null;
}

export interface ExpiringBatch {
  productItemId: string;
  productId: string;
  productName: string;
  expiryDate: string;
  daysLeft: number;
  qty: number;
  expiryLevel: "warn" | "danger";
}

// Get total counts for badge
export async function getNotificationCounts() {
  const [lowRes, expRes] = await Promise.all([
    fetch(`${API_BASE}/dashboard/lowstock`),
    fetch(`${API_BASE}/dashboard/expire`),
  ]);

  const low = await lowRes.json();
  const exp = await expRes.json();

  return {
    lowCount: low.count ?? 0,
    expTotal: exp.total ?? 0,
    expWarn: exp.warn ?? 0,
    expDanger: exp.danger ?? 0,
  };
}

// Get actual items for dropdown
export async function getNotificationLists() {
  const [lowRes, expRes] = await Promise.all([
    fetch(`${API_BASE}/dashboard/lowstock_list?limit=10`),
    fetch(`${API_BASE}/dashboard/expire_list?limit=10`),
  ]);
  return {
    lowList: await lowRes.json(),
    expList: await expRes.json(),
  };
}
