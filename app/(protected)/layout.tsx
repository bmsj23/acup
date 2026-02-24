import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import PageContainer from "@/components/layout/page-container";
import { ROLES } from "@/lib/constants/roles";
import type { UserRole } from "@/types/database";

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
  const role: UserRole =
    typeof profile.role === "string" && profile.role in ROLES
      ? (profile.role as UserRole)
      : "department_head";
  const roleLabel = ROLES[role].label;

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar role={role} />
      <div className="flex min-h-screen w-full flex-col md:pl-72 md:pr-6">
        <PageContainer>
          <Header fullName={fullName} email={profile.email} roleLabel={roleLabel} />
          {children}
        </PageContainer>
      </div>
    </div>
  );
}