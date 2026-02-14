import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import PageContainer from "@/components/layout/page-container";
import { ROLES } from "@/lib/constants/roles";

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

  const fullName = profile.full_name || "Authenticated User";
  const roleLabel = ROLES[profile.role].label;

  return (
    <div className="min-h-screen bg-white md:flex">
      <Sidebar role={profile.role} />
      <div className="flex min-h-screen w-full flex-col">
        <Header fullName={fullName} email={profile.email} roleLabel={roleLabel} />
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}