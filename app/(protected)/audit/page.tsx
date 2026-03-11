import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import AuditLogClient from "@/components/admin/audit-log-client";

export default async function AuditPage() {
  const supabase = await createClient();
  const { user, error } = await getAuthenticatedUser(supabase);

  if (error || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "department_head") {
    redirect("/dashboard");
  }

  return <AuditLogClient />;
}