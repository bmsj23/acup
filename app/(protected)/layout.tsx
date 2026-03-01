import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedProfile, getCachedMembership } from "@/lib/data/auth";
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
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(user.id);

  if (!profile || !profile.is_active) {
    const supabase = await createClient();
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
    const membership = await getCachedMembership(user.id);

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