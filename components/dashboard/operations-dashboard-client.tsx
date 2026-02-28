"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart2,
  CalendarDays,
  Hospital,
  Landmark,
  type LucideIcon,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Department = { id: string; name: string; code: string };
type DailyTrend = {
  date: string;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
};
type DepartmentPerformance = {
  department_id: string;
  department_name: string;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
};
type MetricsSummaryResponse = {
  filters: {
    month: string;
    department_id: string | null;
    available_departments: Department[];
  };
  role_scope: {
    role: "avp" | "division_head" | "department_head";
    member_department_ids: string[];
  };
  totals: {
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    census_opd: number;
    census_er: number;
    equipment_utilization_pct: number;
  };
  previous_totals?: {
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    equipment_utilization_pct: number;
  };
  best_performing_department: DepartmentPerformance | null;
  daily_trend: DailyTrend[];
  department_performance: DepartmentPerformance[];
};

type OperationsDashboardClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  month: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}
// calculates month-over-month percentage change
function computeTrend(current: number, previous: number): { label: string; up: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { label: "+100%", up: true };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { label: `${sign}${pct.toFixed(1)}%`, up: pct >= 0 };
}

function getChartViewLabel(view: "daily" | "weekly" | "monthly") {
  switch (view) {
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return "Daily";
  }
}

function getChartUnit(view: "daily" | "weekly" | "monthly") {
  switch (view) {
    case "weekly":
      return "weeks";
    case "monthly":
      return "months";
    default:
      return "days";
  }
}

function getWeekKey(dateText: string) {
  const date = new Date(dateText);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
}

function getMonthKey(dateText: string) {
  return dateText.slice(0, 7);
}

function formatYAxisCurrency(value: number) {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `₱${(value / 1000).toFixed(0)}k`;
  }

  return `₱${value.toFixed(0)}`;
}

export default function OperationsDashboardClient({
  role,
  defaultDepartmentId,
  month,
}: OperationsDashboardClientProps) {
  const isLeadershipRole = role === "avp" || role === "division_head";
  const [chartView, setChartView] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [censusView, setCensusView] = useState<"total" | "breakdown">("total");
  const [recentPage, setRecentPage] = useState(0);
  const ENTRIES_PER_PAGE = 5;
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    defaultDepartmentId ?? "",
  );
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", selectedMonth);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId, selectedMonth]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Cache logic
      const cacheKey = `acup-metrics-summary:${queryString}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) setSummary(JSON.parse(cached));

      const response = await fetch(`/api/metrics/summary?${queryString}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load");

      const payload = await response.json();
      setSummary(payload);
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
      setError("Failed to load dashboard summary.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  // Derived Data
  const dailyTrend = useMemo(
    () => summary?.daily_trend ?? [],
    [summary?.daily_trend],
  );
  const filteredTrend = useMemo(() => {
    if (chartView === "daily") {
      return dailyTrend;
    }

    if (chartView === "weekly") {
      const grouped = new Map<string, DailyTrend>();
      dailyTrend.forEach((item) => {
        grouped.set(getWeekKey(item.date), item);
      });
      return Array.from(grouped.values());
    }

    const grouped = new Map<string, DailyTrend>();
    dailyTrend.forEach((item) => {
      grouped.set(getMonthKey(item.date), item);
    });
    return Array.from(grouped.values());
  }, [chartView, dailyTrend]);
  const maxRevenue = filteredTrend.reduce(
    (max, item) => (item.revenue_total > max ? item.revenue_total : max),
    0,
  );
  const departments = summary?.filters.available_departments ?? [];
  const topPerf = summary?.department_performance.slice(0, 5) ?? [];
  const minRevenue = filteredTrend.reduce((min, item) => {
    if (min === 0) {
      return item.revenue_total;
    }
    return item.revenue_total < min ? item.revenue_total : min;
  }, 0);
  const avgRevenue =
    filteredTrend.length > 0
      ? filteredTrend.reduce((total, item) => total + item.revenue_total, 0) /
        filteredTrend.length
      : 0;
  const revenueChartData = filteredTrend.map((item) => ({
    date: item.date,
    revenue: item.revenue_total,
  }));

  return (
    <div className="w-full space-y-8">
      {/* Header & Greeting */}
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-zinc-900">
            Good Afternoon
          </h1>
          <p className="mt-1 text-zinc-600">
            Here&apos;s your operational overview for today.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white p-1 border border-zinc-200 shadow-sm">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent px-3 py-1.5 text-sm text-zinc-700 outline-none hover:cursor-pointer"
            />
            <div className="h-4 w-px bg-zinc-200"></div>
            {role !== "department_head" && (
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="bg-transparent px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none hover:cursor-pointer">
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => void loadSummary()}
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 hover:cursor-pointer disabled:cursor-not-allowed">
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

      {/* Stat Cards */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={summary ? formatCurrency(summary.totals.revenue_total) : "-"}
          icon={Landmark}
          iconColor="text-blue-800 bg-blue-50"
          trend={summary?.previous_totals ? computeTrend(summary.totals.revenue_total, summary.previous_totals.revenue_total)?.label : undefined}
          trendUp={summary?.previous_totals ? computeTrend(summary.totals.revenue_total, summary.previous_totals.revenue_total)?.up : undefined}
        />
        <StatCard
          title="Total Census"
          value={summary ? summary.totals.census_total.toLocaleString() : "-"}
          subValue={`OPD: ${summary?.totals.census_opd ?? "-"} | ER: ${summary?.totals.census_er ?? "-"}`}
          icon={Users}
          iconColor="text-violet-600 bg-violet-50"
          trend={summary?.previous_totals ? computeTrend(summary.totals.census_total, summary.previous_totals.census_total)?.label : undefined}
          trendUp={summary?.previous_totals ? computeTrend(summary.totals.census_total, summary.previous_totals.census_total)?.up : undefined}
        />
        <StatCard
          title="Monthly Inputs"
          value={
            summary ? summary.totals.monthly_input_count.toLocaleString() : "-"
          }
          icon={Activity}
          iconColor="text-emerald-600 bg-emerald-50"
          trend={summary?.previous_totals ? computeTrend(summary.totals.monthly_input_count, summary.previous_totals.monthly_input_count)?.label : undefined}
          trendUp={summary?.previous_totals ? computeTrend(summary.totals.monthly_input_count, summary.previous_totals.monthly_input_count)?.up : undefined}
        />
        <StatCard
          title="Equipment Utilization"
          value={
            summary
              ? `${summary.totals.equipment_utilization_pct.toFixed(1)}%`
              : "-"
          }
          icon={Hospital}
          iconColor="text-amber-600 bg-amber-50"
          trend={summary?.previous_totals ? computeTrend(summary.totals.equipment_utilization_pct, summary.previous_totals.equipment_utilization_pct)?.label : undefined}
          trendUp={summary?.previous_totals ? computeTrend(summary.totals.equipment_utilization_pct, summary.previous_totals.equipment_utilization_pct)?.up : undefined}
        />
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-lg font-bold text-zinc-900">
              Revenue Trend
            </h3>
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
              {getChartViewLabel(chartView)} View &bull; {filteredTrend.length} {getChartUnit(chartView)}
            </span>
          </div>

          <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            {(["daily", "weekly", "monthly"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setChartView(v)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
                  chartView === v
                    ? "bg-blue-800 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}>
                {getChartViewLabel(v)}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-blue-800">Peak</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">{formatCurrency(maxRevenue)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Average</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">{formatCurrency(avgRevenue)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Floor</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">{formatCurrency(minRevenue)}</p>
            </div>
          </div>

          <div className="h-64 rounded-xl border border-zinc-100 bg-zinc-50 p-2">
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#356ab7" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#356ab7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) =>
                      new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    }
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatYAxisCurrency}
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(value as number), "Revenue"]}
                    labelFormatter={(label: unknown) =>
                      new Date(label as string).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e4e4e7",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#356ab7"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={{ r: 3, fill: "#356ab7", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Census Trend */}
        <CensusTrendChart
          role={role}
          departmentPerformance={summary?.department_performance ?? []}
          availableDepartments={departments}
          dailyTrend={dailyTrend}
          selectedMonth={selectedMonth}
          censusView={censusView}
          onCensusViewChange={setCensusView}
        />
      </section>

      {/* Top Departments — leadership only */}
      {isLeadershipRole && topPerf.length > 0 && (
        <section>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 font-serif text-lg font-bold text-zinc-900">
              Top Departments
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPerf.map((d) => ({
                    name: d.department_name,
                    revenue: d.revenue_total,
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={formatYAxisCurrency}
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#3f3f46" }}
                    tickLine={false}
                    axisLine={false}
                    width={180}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(value as number), "Revenue"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e4e4e7",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#356ab7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Recent Entries — full width, paginated */}
      <section>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-zinc-900 mb-4">
            Recent Entries
          </h3>
          <div className="space-y-3">
            {(() => {
              const sorted = [...dailyTrend].reverse();
              const totalPages = Math.max(1, Math.ceil(sorted.length / ENTRIES_PER_PAGE));
              const page = Math.min(recentPage, totalPages - 1);
              const pageItems = sorted.slice(page * ENTRIES_PER_PAGE, (page + 1) * ENTRIES_PER_PAGE);

              return (
                <>
                  {pageItems.length > 0 ? pageItems.map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Census: {item.census_total} &bull; Inputs: {item.monthly_input_count}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-900">
                          {formatCurrency(item.revenue_total)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Equip: {item.equipment_utilization_pct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-zinc-500">No entries available.</p>
                  )}

                  {sorted.length > ENTRIES_PER_PAGE && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={page === 0}
                        onClick={() => setRecentPage((p) => Math.max(0, p - 1))}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-zinc-500">
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages - 1}
                        onClick={() => setRecentPage((p) => Math.min(totalPages - 1, p + 1))}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </section>
    </div>
  );
}

type CensusTrendChartProps = {
  role: "avp" | "division_head" | "department_head";
  departmentPerformance: DepartmentPerformance[];
  availableDepartments: Department[];
  dailyTrend: DailyTrend[];
  selectedMonth: string;
  censusView: "total" | "breakdown";
  onCensusViewChange: (v: "total" | "breakdown") => void;
};

function groupDailyByWeek(
  daily: DailyTrend[],
): { name: string; census_total: number; census_opd: number; census_er: number }[] {
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"] as const;
  const buckets = new Map(
    weeks.map((w) => [w, { census_total: 0, census_opd: 0, census_er: 0 }]),
  );
  daily.forEach((item) => {
    const day = new Date(item.date).getDate();
    const key: typeof weeks[number] =
      day <= 7 ? "Week 1" : day <= 14 ? "Week 2" : day <= 21 ? "Week 3" : "Week 4";
    const bucket = buckets.get(key)!;
    bucket.census_total += item.census_total;
    bucket.census_opd += item.census_opd;
    bucket.census_er += item.census_er;
  });
  return Array.from(buckets.entries()).map(([name, vals]) => ({ name, ...vals }));
}

function CensusTrendChart({
  role,
  departmentPerformance,
  availableDepartments,
  dailyTrend,
  censusView,
  onCensusViewChange,
}: CensusTrendChartProps) {
  const isLeadership = role === "avp" || role === "division_head";

  const codeMap = useMemo(
    () => new Map(availableDepartments.map((d) => [d.id, d.code])),
    [availableDepartments],
  );

  const leadershipData = useMemo(
    () =>
      departmentPerformance
        .filter((d) => d.census_total > 0)
        .map((d) => ({
          name: codeMap.get(d.department_id) ?? d.department_name.slice(0, 6),
          fullName: d.department_name,
          census_total: d.census_total,
          census_opd: d.census_opd,
          census_er: d.census_er,
        })),
    [departmentPerformance, codeMap],
  );

  const weeklyData = useMemo(() => groupDailyByWeek(dailyTrend), [dailyTrend]);

  const chartData = isLeadership ? leadershipData : weeklyData;
  const hasData = chartData.some((d) => d.census_total > 0);

  const maxCensus = chartData.reduce(
    (max, item) => (item.census_total > max ? item.census_total : max),
    0,
  );
  const minCensus = chartData.reduce((min, item) => {
    if (min === 0) return item.census_total;
    return item.census_total < min ? item.census_total : min;
  }, 0);
  const avgCensus =
    chartData.length > 0
      ? chartData.reduce((total, item) => total + item.census_total, 0) / chartData.length
      : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-bold text-zinc-900">Census Trend</h3>
        <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
          {isLeadership ? "By Department" : "Weekly Breakdown"}
        </span>
      </div>

      {/* total / breakdown toggle */}
      <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        {(["total", "breakdown"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onCensusViewChange(v)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
              censusView === v ? "bg-blue-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}>
            {v === "total" ? "Total" : "OPD / ER"}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-blue-800">Peak</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">{maxCensus.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Average</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">{Math.round(avgCensus).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Floor</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">{minCensus.toLocaleString()}</p>
        </div>
      </div>
      <div className="h-64 rounded-xl border border-zinc-100 bg-zinc-50 p-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                labelFormatter={(label: unknown) => {
                  const key = label as string;
                  if (isLeadership) {
                    return (chartData as { name: string; fullName?: string }[]).find((d) => d.name === key)?.fullName ?? key;
                  }
                  return key;
                }}
              />
              {censusView === "total" ? (
                <Bar dataKey="census_total" name="Total Census" fill="#356ab7" radius={[4, 4, 0, 0]} />
              ) : (
                <>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  />
                  <Bar
                    dataKey="census_opd"
                    name="OPD"
                    stackId="census"
                    fill="#356ab7"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="census_er"
                    name="ER"
                    stackId="census"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No census data available
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  iconColor,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-zinc-900 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 min-h-6">
        {trend ? (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              trendUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}>
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend}{" "}
            <span className="ml-1 font-normal text-zinc-400">
              vs last month
            </span>
          </div>
        ) : subValue ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
            {subValue}
          </div>
        ) : null}
      </div>
    </div>
  );
}
