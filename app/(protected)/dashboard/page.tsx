import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OperationsDashboardClient from "@/components/dashboard/operations-dashboard-client";
import type { UserRole } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  const month = new Date().toISOString().slice(0, 7);

  return (
    <OperationsDashboardClient
      role={profile.role as UserRole}
      defaultDepartmentId={memberships?.[0]?.department_id ?? null}
      month={month}
    />
  );
}