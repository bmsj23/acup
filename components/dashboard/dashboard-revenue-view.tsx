"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardOverviewResponse } from "@/types/monitoring";
import { formatCurrency, formatInteger } from "./utils";

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

function DetailCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.3rem] border border-blue-100/80 bg-white/95 p-4 shadow-[0_18px_42px_-34px_rgba(30,64,175,0.12)]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{helper}</p>
    </div>
  );
}

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
  const showDepartmentDetail = role === "department_head" || Boolean(selectedDepartmentId);

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
            categorySource={overview?.category_sources.revenue ?? "daily"}
            monthlyTotal={overview?.totals.revenue_total ?? 0}
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
            categorySource={overview?.category_sources.census ?? "daily"}
            currentTotals={{
              census_total: overview?.totals.census_total ?? 0,
              census_opd: overview?.totals.census_opd ?? 0,
              census_er: overview?.totals.census_er ?? 0,
            }}
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

      {showDepartmentDetail && overview ? (
        <section className="rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-6 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Department detail
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                Payer mix, census split, and operations
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Month totals for the selected department. Revenue source: {overview.category_sources.revenue}. Census source: {overview.category_sources.census}. Operations source: {overview.category_sources.operations}.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Payer mix
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <DetailCard
                  label="Self-pay"
                  value={formatInteger(overview.totals.self_pay_count)}
                  helper="Patients recorded under self-pay"
                />
                <DetailCard
                  label="HMO"
                  value={formatInteger(overview.totals.hmo_count)}
                  helper="Patients recorded under HMO"
                />
                <DetailCard
                  label="Guarantee letter"
                  value={formatInteger(overview.totals.guarantee_letter_count)}
                  helper="Patients recorded under guarantee letter"
                />
              </div>
            </div>

            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Census split
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailCard
                  label="Walk-in"
                  value={formatInteger(overview.totals.census_walk_in)}
                  helper="Walk-in patients this month"
                />
                <DetailCard
                  label="Inpatient"
                  value={formatInteger(overview.totals.census_inpatient)}
                  helper="Inpatient patients this month"
                />
                <DetailCard
                  label="OPD"
                  value={formatInteger(overview.totals.census_opd)}
                  helper="OPD patients this month"
                />
                <DetailCard
                  label="ER"
                  value={formatInteger(overview.totals.census_er)}
                  helper="ER patients this month"
                />
              </div>
            </div>

            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Operations
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <DetailCard
                  label="Operational count"
                  value={formatInteger(overview.totals.monthly_input_count)}
                  helper="Saved operational volume for the month"
                />
                <DetailCard
                  label="Revenue total"
                  value={formatCurrency(overview.totals.revenue_total)}
                  helper="Month total revenue in the selected scope"
                />
                <DetailCard
                  label="Total census"
                  value={formatInteger(overview.totals.census_total)}
                  helper="Combined census total for the month"
                />
              </div>
            </div>
          </div>
        </section>
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
