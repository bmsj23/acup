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
function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
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
  const totalRev = topPerf.reduce((t, i) => t + i.revenue_total, 0);
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
  const chartRangePadding = Math.max((maxRevenue - minRevenue) * 0.15, 1);
  const chartMin = Math.max(0, minRevenue - chartRangePadding);
  const chartMax = maxRevenue + chartRangePadding;
  const chartSpan = Math.max(chartMax - chartMin, 1);
  const chartTicks = [
    chartMax,
    chartMax - chartSpan * 0.33,
    chartMax - chartSpan * 0.66,
    chartMin,
  ];
  const chartPoints = filteredTrend.map((item, index) => {
    const x =
      filteredTrend.length > 1
        ? 4 + (index / (filteredTrend.length - 1)) * 92
        : 50;
    const y = 88 - ((item.revenue_total - chartMin) / chartSpan) * 76;
    return {
      x,
      y,
      date: item.date,
      revenue: item.revenue_total,
    };
  });
  const revenueLinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const labelStep = Math.max(1, Math.ceil(filteredTrend.length / 6));
  const chartLabels = chartPoints.filter(
    (_point, index) => index % labelStep === 0 || index === chartPoints.length - 1,
  );

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
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {/* Stat Cards - Solid Style */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={summary ? formatCurrency(summary.totals.revenue_total) : "-"}
          icon={Landmark}
          iconColor="text-blue-600 bg-blue-50"
          trend="+12.5%" // Placeholder trend logic for now
          trendUp={true}
        />
        <StatCard
          title="Monthly Inputs"
          value={
            summary ? summary.totals.monthly_input_count.toLocaleString() : "-"
          }
          icon={Activity}
          iconColor="text-emerald-600 bg-emerald-50"
          trend="+4.2%"
          trendUp={true}
        />
        <StatCard
          title="Total Census"
          value={summary ? summary.totals.census_total.toLocaleString() : "-"}
          subValue={`OPD: ${summary?.totals.census_opd ?? "-"} | ER: ${summary?.totals.census_er ?? "-"}`}
          icon={Users}
          iconColor="text-violet-600 bg-violet-50"
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
          trend="-1.2%"
          trendUp={false}
        />
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Revenue Chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-lg font-bold text-zinc-900">
              Revenue Trend
            </h3>
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
              {getChartViewLabel(chartView)} View • {filteredTrend.length} {getChartUnit(chartView)}
            </span>
          </div>

          <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => setChartView("daily")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
                chartView === "daily"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}>
              Daily
            </button>
            <button
              type="button"
              onClick={() => setChartView("weekly")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
                chartView === "weekly"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}>
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setChartView("monthly")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
                chartView === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}>
              Monthly
            </button>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-blue-600">Peak</p>
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

          <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500">
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Revenue line
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Data points
            </div>
          </div>

          <div className="relative h-64 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            {filteredTrend.length > 0 ? (
              <div className="flex h-full gap-2">
                <div className="flex w-11 flex-col justify-between py-1 text-[10px] text-zinc-500">
                  {chartTicks.map((tick, index) => (
                    <p key={`${tick}-${index}`} className="truncate">
                      {formatYAxisCurrency(tick)}
                    </p>
                  ))}
                </div>

                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="h-full flex-1 overflow-visible">
                  {[12, 38, 63, 88].map((gridY) => (
                    <line
                      key={gridY}
                      x1="4"
                      y1={gridY}
                      x2="96"
                      y2={gridY}
                      stroke="#d4d4d8"
                      strokeWidth="0.35"
                    />
                  ))}
                  <polyline
                    points={revenueLinePoints}
                    fill="none"
                    stroke="#356ab7"
                    strokeWidth="0.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                <div className="pointer-events-none absolute inset-y-3 right-3 left-[3.9rem]">
                  {chartPoints.map((point) => (
                    <span
                      key={point.date}
                      className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#356ab7]"
                      style={{
                        left: `${point.x}%`,
                        top: `${point.y}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                No data available
              </div>
            )}

          </div>

          {chartLabels.length > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
              {chartLabels.map((point) => (
                <p key={point.date} className="whitespace-nowrap">
                  {new Date(point.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        {isLeadershipRole ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 font-serif text-lg font-bold text-zinc-900">
              Top Contributors
            </h3>
            <div className="space-y-5">
              {topPerf.map((dept, i) => {
                const percent =
                  totalRev > 0 ? (dept.revenue_total / totalRev) * 100 : 0;
                return (
                  <div key={dept.department_id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-700">
                        {i + 1}. {dept.department_name}
                      </span>
                      <span className="text-xs font-semibold text-zinc-900">
                        {formatPercent(percent)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900"
                        style={{ width: `${Math.max(percent, 5)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {formatCurrency(dept.revenue_total)}
                    </div>
                  </div>
                );
              })}
              {topPerf.length === 0 ? (
                <p className="text-sm text-zinc-500">No data available.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {/* Activity & Input Section */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-zinc-900 mb-4">
            Recent Entries
          </h3>
          <div className="space-y-3">
            {dailyTrend
              .slice(-5)
              .reverse()
              .map((item) => (
                <div
                  key={item.date}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Census: {item.census_total}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatCurrency(item.revenue_total)}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Update Metrics CTA */}
        {role === "department_head" ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-zinc-900">
                  Ready to log today&apos;s metrics?
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Keep your department data current for accurate reporting.
                </p>
              </div>
              <Link
                href="/metrics"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:cursor-pointer"
              >
                <BarChart2 className="h-4 w-4" />
                Update Metrics
              </Link>
            </div>
          </div>
        ) : null}
      </section>
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
