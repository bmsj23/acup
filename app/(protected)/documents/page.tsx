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

  return <DocumentsClient role={profile?.role ?? "department_head"} />;
}