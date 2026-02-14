import type { SupabaseClient } from "@supabase/supabase-js";

const departmentSelect = "id, name, code, description, is_active, created_at";

export async function listDepartments(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    is_active?: boolean | null;
  },
) {
  let query = supabase
    .from("departments")
    .select(departmentSelect, { count: "exact" })
    .order("name", { ascending: true })
    .range(params.from, params.to);

  if (params.is_active !== null && params.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }

  return await query;
}

export async function getDepartmentById(supabase: SupabaseClient, id: string) {
  return await supabase.from("departments").select("id").eq("id", id).single();
}

export async function listDepartmentMembers(
  supabase: SupabaseClient,
  params: { department_id: string; from: number; to: number },
) {
  return await supabase
    .from("department_memberships")
    .select("id, user_id, department_id, is_primary, joined_at", {
      count: "exact",
    })
    .eq("department_id", params.department_id)
    .order("joined_at", { ascending: false })
    .range(params.from, params.to);
}