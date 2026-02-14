import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account_inactive");
  }

  return <>{children}</>;
}