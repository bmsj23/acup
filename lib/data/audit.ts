import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAuditLog(
  supabase: SupabaseClient,
  request: Request,
  entry: {
    table_name: string;
    record_id: string;
    action: "INSERT" | "UPDATE" | "DELETE";
    new_data?: Record<string, unknown> | null;
    old_data?: Record<string, unknown> | null;
    performed_by: string;
  },
): Promise<void> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const ua = request.headers.get("user-agent") ?? null;

  await supabase.from("audit_logs").insert({
    ...entry,
    ip_address: ip,
    user_agent: ua,
  });
}