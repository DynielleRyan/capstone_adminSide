// frontend/src/services/notificationServices.ts
import api from "./api";

export type BellNotif = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
  created_at: string;
  is_read: boolean;
};

export async function fetchNotifications(unread = true, limit = 20) {
  const { data } = await api.get<{ items: BellNotif[]; unread: number }>(
    "/notifications",
    { params: { unread: unread ? 1 : 0, limit } }
  );
  return data;
}

export async function markNotificationsRead(ids: string[]) {
  const { data } = await api.patch<{ updated: number; unread: number }>(
    "/notifications/read",
    { ids }
  );
  return data;
}

export async function triggerScan() {
  const { data } = await api.post<{ inserted: number }>("/notifications/scan");
  return data;
}
