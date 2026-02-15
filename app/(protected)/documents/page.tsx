import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentsClient from "@/components/documents/documents-client";

export default async function DocumentsPage() {
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

  /*
    Fetch the user's primary department for the upload context.
    If they are AVP/Division Head, they might have multiple or none (if purely oversight),
    but for now we default to the first one found or let them select (if we expand the modal).
    For Phase 4, we pass the first membership as the default upload target.
  */
  const { data: memberships } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("user_id", user.id)
    .limit(1);

  const defaultDepartmentId = memberships?.[0]?.department_id ?? null;

  return (
    <DocumentsClient
      role={profile?.role ?? "department_head"}
      departmentId={defaultDepartmentId}
    />
  );
}
