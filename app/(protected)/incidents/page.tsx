import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IncidentsClient from "@/components/incidents/incidents-client";

export default async function IncidentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  const userDepartmentId = memberships?.[0]?.department_id ?? null;

  let userDepartmentName: string | null = null;
  if (userDepartmentId) {
    const { data: dept } = await supabase
      .from("departments")
      .select("name")
      .eq("id", userDepartmentId)
      .single();
    userDepartmentName = dept?.name ?? null;
  }

  return (
    <IncidentsClient
      role={(profile?.role as "avp" | "division_head" | "department_head") ?? "department_head"}
      userDepartmentId={userDepartmentId}
      userDepartmentName={userDepartmentName}
    />
  );
}