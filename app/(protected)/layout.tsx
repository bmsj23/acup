import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedProfile, getCachedMembership } from "@/lib/data/auth";
import Header from "@/components/layout/header";
import ProtectedContentFrame from "@/components/layout/protected-content-frame";
import Sidebar from "@/components/layout/sidebar";
import SidebarContentWrapper from "@/components/layout/sidebar-content-wrapper";
import PageContainer from "@/components/layout/page-container";
import QueryProvider from "@/components/providers/query-provider";
import { RouteTransitionProvider } from "@/components/providers/route-transition-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import NetworkStatusBanner from "@/components/ui/network-status-banner";
import { ROLES } from "@/lib/constants/roles";
import { DEPARTMENT_SHORT_LABELS } from "@/lib/constants/departments";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
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
  const membership = await getCachedMembership(user.id);
  const defaultDepartmentId = membership?.department_id ?? null;
  const membershipDepartment =
    (membership?.departments as {
      code?: string;
      is_revenue?: boolean | null;
      is_census?: boolean | null;
      supports_turnaround_time?: boolean | null;
    } | null) ?? null;

  let displayLabel = roleLabel;
  if (role === "avp") {
    displayLabel = "AVP";
  } else if (role === "division_head") {
    displayLabel = "Ancillary Director";
  } else {
    const deptCode = membershipDepartment?.code as DepartmentCode | undefined;
    if (deptCode && deptCode in DEPARTMENT_SHORT_LABELS) {
      // eslint-disable-next-line security/detect-object-injection
      displayLabel = DEPARTMENT_SHORT_LABELS[deptCode];
    }
  }

  return (
    <QueryProvider>
      <RouteTransitionProvider defaultDepartmentId={defaultDepartmentId}>
        <SidebarProvider>
          <div className="min-h-screen bg-transparent">
            <Sidebar
              role={role}
              departmentCapabilities={getDepartmentCapabilities(membershipDepartment)}
            />
            <SidebarContentWrapper>
              <PageContainer>
                <Header email={profile.email} roleLabel={roleLabel} displayLabel={displayLabel} />
                <NetworkStatusBanner />
                <ProtectedContentFrame>{children}</ProtectedContentFrame>
              </PageContainer>
            </SidebarContentWrapper>
          </div>
        </SidebarProvider>
      </RouteTransitionProvider>
    </QueryProvider>
  );
}
