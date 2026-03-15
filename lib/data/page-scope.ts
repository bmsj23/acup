import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/data/auth";
import { getRoleScope, listScopedDepartments } from "@/lib/data/monitoring";
import type { UserRole } from "@/types/database";
import type { MonitoringDepartment } from "@/types/monitoring";

export async function getProtectedPageScope() {
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { role, memberDepartmentIds, primaryDepartmentId, error } = await getRoleScope(
    supabase,
    user.id,
  );

  if (error || !role) {
    redirect("/dashboard");
  }

  const { data: departments } = await listScopedDepartments(supabase, {
    role: role as UserRole,
    memberDepartmentIds,
  });

  return {
    user,
    role: role as UserRole,
    memberDepartmentIds,
    defaultDepartmentId: primaryDepartmentId,
    defaultDepartment:
      (departments ?? []).find((department) => department.id === primaryDepartmentId) ?? null,
    availableDepartments: (departments ?? []) as MonitoringDepartment[],
  };
}
