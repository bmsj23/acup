"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardOverviewResponse } from "@/types/monitoring";

const RevenueTrendChart = dynamic(() => import("./revenue-trend-chart"), {
  loading: () => <div className="h-96 rounded-2xl bg-zinc-200" />,
  ssr: false,
});
const CensusTrendChart = dynamic(() => import("./census-trend-chart"), {
  loading: () => <div className="h-96 rounded-2xl bg-zinc-200" />,
  ssr: false,
});
const TopDepartmentsChart = dynamic(() => import("./top-departments-chart"), {
  loading: () => <div className="h-72 rounded-2xl bg-zinc-200" />,
  ssr: false,
});
const RecentEntries = dynamic(() => import("./recent-entries"), {
  loading: () => <div className="h-80 rounded-2xl bg-zinc-200" />,
  ssr: false,
});

function DeferredSection({
  children,
  placeholderClassName,
  forceVisible = false,
}: {
  children: ReactNode;
  placeholderClassName: string;
  forceVisible?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isVisible || forceVisible || !element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [element, forceVisible, isVisible]);

  if (forceVisible || isVisible) {
    return <>{children}</>;
  }

  return <div ref={setElement} className={placeholderClassName} aria-hidden />;
}

type DashboardRevenueViewProps = {
  role: "avp" | "division_head" | "department_head";
  selectedMonth: string;
  selectedDepartmentId: string;
  overview: DashboardOverviewResponse | null;
  isPrintMode: boolean;
  onCaptureRefChange: (index: number, capture: () => Promise<void>) => void;
};

export default function DashboardRevenueView({
  role,
  selectedMonth,
  selectedDepartmentId,
  overview,
  isPrintMode,
  onCaptureRefChange,
}: DashboardRevenueViewProps) {
  const departments = overview?.filters.available_departments ?? [];
  const topPerformance = overview?.department_performance.slice(0, 5) ?? [];
  const dailyTrend = overview?.daily_trend ?? [];
  const isLeadershipRole = role === "avp" || role === "division_head";

  return (
    <>
      <DeferredSection
        forceVisible={isPrintMode}
        placeholderClassName="h-[34rem] rounded-2xl bg-zinc-200"
      >
        <section className="grid gap-6 xl:grid-cols-2">
          <RevenueTrendChart
            key={`rev-${selectedMonth}-${selectedDepartmentId}`}
            initialDailyTrend={dailyTrend}
            initialMonth={selectedMonth}
            departmentId={selectedDepartmentId}
            onCaptureRef={(capture) => {
              onCaptureRefChange(0, capture);
            }}
          />
          <CensusTrendChart
            key={`cen-${selectedMonth}-${selectedDepartmentId}`}
            role={role}
            initialDepartmentPerformance={overview?.department_performance ?? []}
            availableDepartments={departments}
            initialDailyTrend={dailyTrend}
            initialMonth={selectedMonth}
            departmentId={selectedDepartmentId}
            onCaptureRef={(capture) => {
              onCaptureRefChange(1, capture);
            }}
          />
        </section>
      </DeferredSection>

      {isLeadershipRole ? (
        <DeferredSection
          forceVisible={isPrintMode}
          placeholderClassName="h-72 rounded-2xl bg-zinc-200"
        >
          <TopDepartmentsChart
            key={`top-${selectedMonth}-${selectedDepartmentId}`}
            initialTopPerf={topPerformance}
            initialMonth={selectedMonth}
            departmentId={selectedDepartmentId}
            onCaptureRef={(capture) => {
              onCaptureRefChange(2, capture);
            }}
          />
        </DeferredSection>
      ) : null}

      <DeferredSection
        forceVisible={isPrintMode}
        placeholderClassName="h-80 rounded-2xl bg-zinc-200"
      >
        <RecentEntries dailyTrend={dailyTrend} />
      </DeferredSection>
    </>
  );
}
