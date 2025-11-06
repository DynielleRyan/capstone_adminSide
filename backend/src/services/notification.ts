import { supabaseAdmin } from "../config/database";

type NotifType = "LOW_STOCK" | "EXPIRING";

export async function createNotificationOncePerDay(input: {
  type: NotifType;
  product_id: string;
  product_item_id?: string | null;
  title: string;
  message: string;
  severity?: "info" | "warning" | "danger";
  meta?: Record<string, any>;
}) {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      type: input.type,
      product_id: input.product_id,
      product_item_id: input.product_item_id ?? null,
      title: input.title,
      message: input.message,
      severity: input.severity ?? "warning",
      meta: input.meta ?? {},
    })
    .select("*")
    .single();

  if (error && String(error.code) !== "23505") throw error;
  return data ?? null;
}
