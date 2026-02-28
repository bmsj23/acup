import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import PageContainer from "@/components/layout/page-container";
import { ROLES } from "@/lib/constants/roles";
import { DEPARTMENT_SHORT_LABELS } from "@/lib/constants/departments";
import type { UserRole } from "@/types/database";
import type { DepartmentCode } from "@/lib/constants/departments";

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
    .select("id, email, full_name, role, is_active, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account_inactive");
  }

  // redirect first-login users to password change page
  if (profile.must_change_password) {
    redirect("/change-password");
  }

  const role: UserRole =
    typeof profile.role === "string" && profile.role in ROLES
      ? (profile.role as UserRole)
      : "department_head";
  // eslint-disable-next-line security/detect-object-injection
  const roleLabel = ROLES[role].label;

  let displayLabel = roleLabel;
  if (role === "avp") {
    displayLabel = "AVP";
  } else if (role === "division_head") {
    displayLabel = "Ancillary Director";
  } else {
    const { data: membership } = await supabase
      .from("department_memberships")
      .select("departments(code)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const deptCode = (membership?.departments as unknown as { code: string } | null)?.code as DepartmentCode | undefined;
    if (deptCode && deptCode in DEPARTMENT_SHORT_LABELS) {
      // eslint-disable-next-line security/detect-object-injection
      displayLabel = DEPARTMENT_SHORT_LABELS[deptCode];
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar role={role} />
      <div className="flex min-h-screen w-full flex-col md:pl-72 md:pr-6">
        <PageContainer>
          <Header email={profile.email} roleLabel={roleLabel} displayLabel={displayLabel} />
          {children}
        </PageContainer>
      </div>
    </div>
  );
}