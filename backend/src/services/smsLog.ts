import { supabase } from "../config/database";

export async function smsSentToday(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("SMS_Log")
    .select("sent_at")
    .gte("sent_at", `${today}T00:00:00`)
    .lte("sent_at", `${today}T23:59:59`);

  if (error) {
    console.error("SMS log check failed:", error);
    return false;
  }

  return data && data.length > 0;
}

export async function logSmsSend() {
  const { error } = await supabase.from("SMS_Log").insert({});
  if (error) console.error("Failed to log SMS:", error);
}
