import type { SupabaseClient } from "@supabase/supabase-js";

const subdepartmentSelect =
  "id, department_id, name, code, is_active, created_at";

export async function listSubdepartments(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    is_active?: boolean | null;
  },
) {
  let query = supabase
    .from("department_subdepartments")
    .select(subdepartmentSelect, { count: "exact" })
    .order("name", { ascending: true })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.is_active !== null && params.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }

  return await query;
}
