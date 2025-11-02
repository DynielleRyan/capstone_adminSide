// src/services/notificationServices.ts
import api from "./api";

// ========== TYPES ==========
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

// Response shapes from backend
interface LowStockCountResponse {
  count: number;
}

interface ExpiringCountResponse {
  total: number;
  warn: number;
  danger: number;
}

// ========== API CALLS ==========

// 🔔 Badge counts
export async function getNotificationCounts(): Promise<{
  lowCount: number;
  expTotal: number;
  expWarn: number;
  expDanger: number;
}> {
  const [low, exp] = await Promise.all([
    api.get<LowStockCountResponse>("/dashboard/lowstock").then((r) => r.data),
    api.get<ExpiringCountResponse>("/dashboard/expire").then((r) => r.data),
  ]);

  return {
    lowCount: low?.count ?? 0,
    expTotal: exp?.total ?? 0,
    expWarn: exp?.warn ?? 0,
    expDanger: exp?.danger ?? 0,
  };
}

// 📋 Lists for dropdown
export async function getNotificationLists(
  limit = 10
): Promise<{
  lowList: LowStockItem[];
  expList: ExpiringBatch[];
}> {
  const [lowList, expList] = await Promise.all([
    api
      .get<LowStockItem[]>("/dashboard/lowstock_list", { params: { limit } })
      .then((r) => r.data),
    api
      .get<ExpiringBatch[]>("/dashboard/expire_list", { params: { limit } })
      .then((r) => r.data),
  ]);

  return {
    lowList: Array.isArray(lowList) ? lowList : [],
    expList: Array.isArray(expList) ? expList : [],
  };
}
