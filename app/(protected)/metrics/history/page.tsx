import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MetricsHistoryClient from "@/components/metrics/metrics-history-client";

export default async function MetricsHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = (profile?.role as "avp" | "division_head" | "department_head") ?? "department_head";

  const { data: memberships } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const memberDeptIds = (memberships ?? []).map((m) => m.department_id);
  const defaultDepartmentId = memberDeptIds[0] ?? null;

  const isLeadership = userRole === "avp" || userRole === "division_head";

  let availableDepartments: { id: string; name: string; code: string }[] = [];
  if (isLeadership) {
    const { data: depts } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name");
    availableDepartments = depts ?? [];
  } else {
    const { data: depts } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("is_active", true)
      .in("id", memberDeptIds.length > 0 ? memberDeptIds : ["00000000-0000-0000-0000-000000000000"]);
    availableDepartments = depts ?? [];
  }

  return (
    <MetricsHistoryClient
      role={userRole}
      defaultDepartmentId={defaultDepartmentId}
      availableDepartments={availableDepartments}
    />
  );
}