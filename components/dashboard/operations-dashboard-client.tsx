"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import dynamic from "next/dynamic";
import Select from "@/components/ui/select";
import MonthPicker from "@/components/ui/month-picker";
import { NON_REVENUE_DEPARTMENT_CODES } from "@/lib/constants/departments";
import type { MetricsSummaryResponse } from "./types";
import { computeTrend, formatCurrency, shiftMonth } from "./utils";
import StatCard from "./stat-card";
import RecentEntries from "./recent-entries";

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

type OperationsDashboardClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  month: string;
  initialSummary?: MetricsSummaryResponse | null;
  initialIncidents?: { id: string; sbar_situation: string; date_of_incident: string; departments?: { name: string } | null }[];
};

export default function OperationsDashboardClient({
  role,
  defaultDepartmentId,
  month,
  initialSummary = null,
  initialIncidents = [],
}: OperationsDashboardClientProps) {
  const isLeadershipRole = role === "avp" || role === "division_head";

  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    defaultDepartmentId ?? "",
  );
  const [dashboardView, setDashboardView] = useState<"revenue" | "non-revenue">("revenue");
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDeptCode = useMemo(() => {
    if (!selectedDepartmentId) return null;
    const dept = (summary?.filters.available_departments ?? []).find((d) => d.id === selectedDepartmentId);
    return dept?.code ?? null;
  }, [selectedDepartmentId, summary?.filters.available_departments]);

  const isNonRevenueDept = useMemo(() => {
    if (!selectedDeptCode) return false;
    return NON_REVENUE_DEPARTMENT_CODES.includes(selectedDeptCode as never);
  }, [selectedDeptCode]);

  const [unresolvedIncidents, setUnresolvedIncidents] = useState<
    { id: string; sbar_situation: string; date_of_incident: string; departments?: { name: string } | null }[]
  >(initialIncidents);
  const [incidentCount, setIncidentCount] = useState(0);
  const [incidentBannerDismissed, setIncidentBannerDismissed] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", selectedMonth);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId, selectedMonth]);

  // seed session cache with server-provided data on mount
  useState(() => {
    if (initialSummary && typeof window !== "undefined") {
      const initialParams = new URLSearchParams({ month });
      if (defaultDepartmentId && role === "department_head") {
        initialParams.set("department_id", defaultDepartmentId);
      }
      const key = `acup-metrics-summary:${initialParams.toString()}`;
      sessionStorage.setItem(key, JSON.stringify(initialSummary));
    }
    return true;
  });

  const loadSummary = useCallback(async () => {
    setError(null);
    const cacheKey = `acup-metrics-summary:${queryString}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      setSummary(JSON.parse(cached));
      setLoading(false);
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/metrics/summary?${queryString}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load");

      const payload = await response.json();
      setSummary(payload);
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
      if (!cached) setError("Failed to load dashboard summary.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  // auto-switch to non-revenue view for non-revenue department heads
  useEffect(() => {
    if (isNonRevenueDept && !isLeadershipRole) {
      setDashboardView("non-revenue");
    }
  }, [isNonRevenueDept, isLeadershipRole]);

  useEffect(() => {
    // skip if server already provided initial incidents
    if (initialIncidents.length > 0) return;

    async function fetchUnresolved() {
      try {
        const res = await fetch("/api/incidents?is_resolved=false&limit=5", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const payload = await res.json();
        setUnresolvedIncidents(payload.data ?? []);
      } catch {
        // silently fail
      }
    }

    void fetchUnresolved();
  }, [initialIncidents.length]);

  useEffect(() => {
    async function fetchIncidentCount() {
      try {
        const [year, m] = selectedMonth.split("-").map(Number);
        const startDate = `${year}-${String(m).padStart(2, "0")}-01`;
        const lastDay = new Date(year, m, 0).getDate();
        const endDate = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const params = new URLSearchParams();
        params.set("start_date", startDate);
        params.set("end_date", endDate);
        params.set("limit", "1");
        if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);

        const res = await fetch(`/api/incidents?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const payload = await res.json();
        setIncidentCount(payload.pagination?.total ?? 0);
      } catch {
        setIncidentCount(0);
      }
    }

    void fetchIncidentCount();
  }, [selectedMonth, selectedDepartmentId]);

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
              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
            <button
              type="button"
              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
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
          {isRefreshing && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
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
            onClick={() => void loadSummary()}
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
        <div className="rounded-xl bg-red-50 p-4 text-red-600 border border-red-100">
          {error}
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
              value={summary ? summary.totals.census_total.toLocaleString() : "-"}
              subValue={`OPD: ${summary?.totals.census_opd ?? "-"} | ER: ${summary?.totals.census_er ?? "-"}`}
              icon={Users}
              iconColor="text-blue-800 bg-blue-50"
              trend={summary?.previous_totals ? computeTrend(summary.totals.census_total, summary.previous_totals.census_total)?.label : undefined}
              trendUp={summary?.previous_totals ? computeTrend(summary.totals.census_total, summary.previous_totals.census_total)?.up : undefined}
            />
            <StatCard
              title="Incident Reports"
              value={incidentCount.toLocaleString()}
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

          {/* charts */}
          <section className="grid gap-6 xl:grid-cols-2">
            <RevenueTrendChart
              initialDailyTrend={dailyTrend}
              initialMonth={selectedMonth}
              departmentId={selectedDepartmentId}
            />
            <CensusTrendChart
              role={role}
              initialDepartmentPerformance={summary?.department_performance ?? []}
              availableDepartments={departments}
              initialDailyTrend={dailyTrend}
              initialMonth={selectedMonth}
              departmentId={selectedDepartmentId}
            />
          </section>

          {isLeadershipRole && topPerf.length > 0 && (
            <TopDepartmentsChart
              initialTopPerf={topPerf}
              initialMonth={selectedMonth}
              departmentId={selectedDepartmentId}
            />
          )}

          <RecentEntries dailyTrend={dailyTrend} />
        </>
      ) : (
        <NonRevenueSection selectedMonth={selectedMonth} />
      )}
    </div>
  );
}