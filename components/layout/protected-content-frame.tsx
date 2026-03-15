"use client";

import {
  AnnouncementsPageSkeleton,
  AuditLogsSkeleton,
  DashboardPageSkeleton,
  DefaultProtectedSkeleton,
  IncidentsPageSkeleton,
  MetricsEntrySkeleton,
  MetricsHistorySkeleton,
  WorkspaceModuleSkeleton,
} from "@/components/loading/page-skeletons";
import { useRouteTransition } from "@/components/providers/route-transition-provider";

type ProtectedContentFrameProps = {
  children: React.ReactNode;
};

function buildFallback(pathname: string | null) {
  if (pathname === "/dashboard") {
    return <DashboardPageSkeleton />;
  }

  if (pathname === "/announcements") {
    return <AnnouncementsPageSkeleton />;
  }

  if (pathname === "/incidents") {
    return <IncidentsPageSkeleton />;
  }

  if (pathname === "/equipment") {
    return <WorkspaceModuleSkeleton statCount={4} leftPanelCount={2} rowCount={4} />;
  }

  if (pathname === "/productivity") {
    return <WorkspaceModuleSkeleton statCount={3} rowCount={4} />;
  }

  if (pathname?.startsWith("/training/modules")) {
    return <WorkspaceModuleSkeleton statCount={3} leftPanelCount={1} rowCount={5} />;
  }

  if (pathname === "/training") {
    return <WorkspaceModuleSkeleton statCount={4} leftPanelCount={2} rowCount={4} />;
  }

  if (pathname === "/turnaround-time") {
    return <WorkspaceModuleSkeleton statCount={4} leftPanelCount={1} rowCount={5} />;
  }

  if (pathname === "/audit") {
    return <AuditLogsSkeleton />;
  }

  if (pathname === "/metrics") {
    return <MetricsEntrySkeleton />;
  }

  if (pathname?.startsWith("/metrics/history")) {
    return <MetricsHistorySkeleton />;
  }

  return <DefaultProtectedSkeleton />;
}

export default function ProtectedContentFrame({
  children,
}: ProtectedContentFrameProps) {
  const { isPanelPending, pendingPathname } = useRouteTransition();

  return (
    <div className="relative min-h-[24rem]">
      <div
        className={`transition-opacity duration-150 ${
          isPanelPending ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={isPanelPending}
      >
        {children}
      </div>

      {isPanelPending ? (
        <div className="absolute inset-0 z-10 rounded-[2rem] bg-white/96 backdrop-blur-[1px]">
          {buildFallback(pendingPathname)}
        </div>
      ) : null}
    </div>
  );
}
