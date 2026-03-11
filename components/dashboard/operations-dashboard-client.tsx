"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Hospital,
  Landmark,
  Loader2,
  Printer,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Select from "@/components/ui/select";
import MonthPicker from "@/components/ui/month-picker";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import { NON_REVENUE_DEPARTMENT_CODES } from "@/lib/constants/departments";
import type { MetricsSummaryResponse } from "./types";
import { computeTrend, formatCurrency, formatInteger, formatMonthLabel, normalizeMonth, shiftMonth } from "./utils";
import StatCard from "./stat-card";

// lazy-load chart components to keep them out of the critical js bundle
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
const NonRevenueSection = dynamic(() => import("./non-revenue-section"), {
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
}: {
  children: React.ReactNode;
  placeholderClassName: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isVisible || !element) return;

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
  }, [element, isVisible]);

  if (isVisible) return <>{children}</>;

  return <div ref={setElement} className={placeholderClassName} aria-hidden />;
}

type OperationsDashboardClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  month: string;
  initialSummary?: MetricsSummaryResponse | null;
  initialIncidents?: { id: string; sbar_situation: string; date_of_incident: string; departments?: { name: string } | null }[];
};

function OperationsDashboardInner({
  role,
  defaultDepartmentId,
  month,
  initialSummary = null,
  initialIncidents = [],
}: OperationsDashboardClientProps) {
  const router = useRouter();
  const isLeadershipRole = role === "avp" || role === "division_head";

  const [selectedMonth, setSelectedMonth] = useState(() => normalizeMonth(month));

  const handleMonthChange = (raw: string) => setSelectedMonth(normalizeMonth(raw));
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    defaultDepartmentId ?? "",
  );

  // derive initial view from props so we avoid calling setState inside an effect
  const [dashboardView, setDashboardView] = useState<"revenue" | "non-revenue">(() => {
    if (isLeadershipRole || !defaultDepartmentId) return "revenue";
    const dept = (initialSummary?.filters.available_departments ?? []).find(
      (d) => d.id === defaultDepartmentId,
    );
    if (dept?.code && NON_REVENUE_DEPARTMENT_CODES.includes(dept.code as never)) return "non-revenue";
    return "revenue";
  });
  const [incidentBannerDismissed, setIncidentBannerDismissed] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", selectedMonth);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId, selectedMonth]);

  const shouldUseInitialSummary =
    selectedMonth === month && selectedDepartmentId === (defaultDepartmentId ?? "");

  const {
    data: summary = null,
    isLoading: loading,
    isFetching: isRefreshing,
    error: summaryError,
    dataUpdatedAt,
    refetch: refetchSummary,
  } = useQuery<MetricsSummaryResponse | null>({
    queryKey: ["metrics-summary", selectedMonth, selectedDepartmentId],
    queryFn: async () => {
      const response = await fetch(`/api/metrics/summary?${queryString}`, {
        method: "GET",
        credentials: "include",
      });
      if (response.status === 401) {
        router.push("/login");
        throw new Error("Unauthorized");
      }
      if (!response.ok) throw new Error("Failed to load dashboard summary.");
      return response.json();
    },
    initialData: shouldUseInitialSummary ? initialSummary : undefined,
    staleTime: 30_000,
  });

  const error = summaryError?.message ?? null;

  const selectedDeptCode = useMemo(() => {
    if (!selectedDepartmentId) return null;
    const dept = (summary?.filters.available_departments ?? []).find((d) => d.id === selectedDepartmentId);
    return dept?.code ?? null;
  }, [selectedDepartmentId, summary?.filters.available_departments]);

  const isNonRevenueDept = useMemo(() => {
    if (!selectedDeptCode) return false;
    return NON_REVENUE_DEPARTMENT_CODES.includes(selectedDeptCode as never);
  }, [selectedDeptCode]);

  // incidents: always fresh (staleTime: 0)
  const incidentCountQuery = useMemo(() => {
    const [year, m] = selectedMonth.split("-").map(Number);
    const startDate = `${year}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const params = new URLSearchParams();
    params.set("start_date", startDate);
    params.set("end_date", endDate);
    params.set("limit", "1");
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedMonth, selectedDepartmentId]);

  const { data: incidentCount = 0 } = useQuery<number>({
    queryKey: ["incidents-count", incidentCountQuery],
    queryFn: async () => {
      const res = await fetch(`/api/incidents?${incidentCountQuery}`, {
        method: "GET",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return 0;
      }
      if (!res.ok) return 0;
      const payload = await res.json();
      return payload.pagination?.total ?? 0;
    },
    staleTime: 0,
  });

  const { data: unresolvedIncidents = [] } = useQuery<
    { id: string; sbar_situation: string; date_of_incident: string; departments?: { name: string } | null }[]
  >({
    queryKey: ["incidents-unresolved-banner"],
    queryFn: async () => {
      const res = await fetch("/api/incidents?is_resolved=false&limit=5", {
        method: "GET",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return [];
      }
      if (!res.ok) return [];
      const payload = await res.json();
      return payload.data ?? [];
    },
    initialData: initialIncidents.length > 0 ? initialIncidents : undefined,
    staleTime: 0,
  });

  // derived from react-query timestamp — uses locale formatting so suppress hydration warning on the element
  const dataAsOf = useMemo(
    () =>
      dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
    [dataUpdatedAt],
  );

  const dailyTrend = useMemo(
    () => summary?.daily_trend ?? [],
    [summary?.daily_trend],
  );
  const departments = summary?.filters.available_departments ?? [];
  const topPerf = summary?.department_performance.slice(0, 5) ?? [];

  return (
    <div className="w-full space-y-8">
      {/* header with filters */}
      <section className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex w-full items-center gap-2 rounded-xl bg-white p-1 border border-zinc-200 shadow-sm">
            <button
              type="button"
              onClick={() => handleMonthChange(shiftMonth(selectedMonth, -1))}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <MonthPicker
              value={selectedMonth}
              onChange={handleMonthChange}
            />
            <button
              type="button"
              onClick={() => handleMonthChange(shiftMonth(selectedMonth, 1))}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {role !== "department_head" && (
              <>
                <div className="h-4 w-px bg-zinc-200"></div>
                <Select
                  value={selectedDepartmentId}
                  onChange={setSelectedDepartmentId}
                  options={[
                    { value: "", label: "All Departments" },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                  className="min-w-45 flex-1 border-0 bg-transparent shadow-none focus:ring-0 focus:border-0 px-3 py-1.5 text-sm font-medium text-zinc-700"
                  dropdownMinWidth={420}
                  aria-label="Select department"
                />
              </>
            )}
          </div>
          {isLeadershipRole && (
            <div className="flex w-full items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setDashboardView("revenue")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors hover:cursor-pointer ${
                  dashboardView === "revenue"
                    ? "bg-blue-800 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Revenue Departments
              </button>
              <button
                type="button"
                onClick={() => setDashboardView("non-revenue")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors hover:cursor-pointer ${
                  dashboardView === "non-revenue"
                    ? "bg-blue-800 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Non-Revenue Departments
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            {isRefreshing && !loading && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            )}
            {dataAsOf && !isRefreshing && (
              <span suppressHydrationWarning>Data as of {dataAsOf}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:cursor-pointer hover:bg-zinc-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={() => void refetchSummary()}
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 hover:cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
          {role === "department_head" && (
            <Link
              href="/metrics"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 hover:cursor-pointer"
            >
              <BarChart2 className="h-4 w-4" />
              Update Metrics
            </Link>
          )}
        </div>
      </section>

      {error && (
        <InlineErrorBanner message={error} onRetry={() => void refetchSummary()} />
      )}

      {isRefreshing && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading dashboard data for {formatMonthLabel(selectedMonth)}...</span>
        </div>
      )}

      {unresolvedIncidents.length > 0 && !incidentBannerDismissed && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-red-800">
                {unresolvedIncidents.length} Unresolved Incident{unresolvedIncidents.length > 1 ? "s" : ""}
              </h2>
              <ul className="mt-2 space-y-1">
                {unresolvedIncidents.slice(0, 3).map((inc) => (
                  <li key={inc.id} className="text-xs text-red-700">
                    <span className="font-medium">{inc.departments?.name ?? "Unknown Dept"}</span>
                    {" - "}
                    <span className="line-clamp-1 inline">{inc.sbar_situation}</span>
                    <span className="ml-1 text-red-700">({inc.date_of_incident})</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/incidents"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 underline decoration-red-300 transition-colors hover:cursor-pointer hover:text-red-900"
              >
                View all incidents
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setIncidentBannerDismissed(true)}
              className="rounded-md p-1 text-red-400 transition-colors hover:cursor-pointer hover:bg-red-100 hover:text-red-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {loading && !summary && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
          <p className="text-sm text-zinc-500">Loading dashboard data...</p>
        </div>
      )}

      {dashboardView === "revenue" && !isNonRevenueDept ? (
        <>
          {/* stat cards */}
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div
              className="relative flex h-full flex-col rounded-2xl p-6 transition-all hover:border-zinc-300 hover:shadow-lg"
              style={{ backgroundColor: "#002366" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Total Revenue</p>
                  <h2 className="mt-2 text-2xl font-bold text-white tracking-tight">
                    {summary ? formatCurrency(summary.totals.revenue_total) : "-"}
                  </h2>
                </div>
                <div className="relative">
                  <div className="p-2.5 rounded-xl bg-white/20">
                    <Landmark className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="mt-4 min-h-6">
                {summary?.previous_totals ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
                    <span className="text-[11px]">
                      {computeTrend(summary.totals.revenue_total, summary.previous_totals.revenue_total)?.label}
                    </span>
                    <span className="ml-1 text-[11px] text-sky-100/80">vs last month</span>
                  </div>
                ) : null}
              </div>
            </div>
            <StatCard
              title="Total Census"
              value={summary ? formatInteger(summary.totals.census_total) : "-"}
              subValue={`OPD: ${summary?.totals.census_opd ?? "-"} | ER: ${summary?.totals.census_er ?? "-"}`}
              icon={Users}
              iconColor="text-blue-800 bg-blue-50"
              trend={summary?.previous_totals ? computeTrend(summary.totals.census_total, summary.previous_totals.census_total)?.label : undefined}
              trendUp={summary?.previous_totals ? computeTrend(summary.totals.census_total, summary.previous_totals.census_total)?.up : undefined}
            />
            <StatCard
              title="Incident Reports"
              value={formatInteger(incidentCount)}
              icon={AlertTriangle}
              iconColor="text-red-700 bg-red-50"
            />
            <StatCard
              title="Equipment Utilization"
              value={
                summary
                  ? `${summary.totals.equipment_utilization_pct.toFixed(1)}%`
                  : "-"
              }
              icon={Hospital}
              iconColor="text-blue-800 bg-blue-50"
              trend={summary?.previous_totals ? computeTrend(summary.totals.equipment_utilization_pct, summary.previous_totals.equipment_utilization_pct)?.label : undefined}
              trendUp={summary?.previous_totals ? computeTrend(summary.totals.equipment_utilization_pct, summary.previous_totals.equipment_utilization_pct)?.up : undefined}
            />
          </section>

          <DeferredSection placeholderClassName="h-[34rem] rounded-2xl bg-zinc-200" >
            {/* charts */}
            <section className="grid gap-6 xl:grid-cols-2">
              <RevenueTrendChart
                key={`rev-${selectedMonth}-${selectedDepartmentId}`}
                initialDailyTrend={dailyTrend}
                initialMonth={selectedMonth}
                departmentId={selectedDepartmentId}
              />
              <CensusTrendChart
                key={`cen-${selectedMonth}-${selectedDepartmentId}`}
                role={role}
                initialDepartmentPerformance={summary?.department_performance ?? []}
                availableDepartments={departments}
                initialDailyTrend={dailyTrend}
                initialMonth={selectedMonth}
                departmentId={selectedDepartmentId}
              />
            </section>
          </DeferredSection>

          {isLeadershipRole && (
            <DeferredSection placeholderClassName="h-72 rounded-2xl bg-zinc-200" >
              <TopDepartmentsChart
                key={`top-${selectedMonth}-${selectedDepartmentId}`}
                initialTopPerf={topPerf}
                initialMonth={selectedMonth}
                departmentId={selectedDepartmentId}
              />
            </DeferredSection>
          )}

          <DeferredSection placeholderClassName="h-80 rounded-2xl bg-zinc-200" >
            <RecentEntries dailyTrend={dailyTrend} />
          </DeferredSection>
        </>
      ) : (
        <NonRevenueSection selectedMonth={selectedMonth} />
      )}
    </div>
  );
}

export default function OperationsDashboardClient(props: OperationsDashboardClientProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OperationsDashboardInner {...props} />
    </QueryClientProvider>
  );
}