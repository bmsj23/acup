"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DailyTrend, Department, DepartmentPerformance, UserRole } from "./types";
import { formatMonthLabel, shiftMonth } from "./utils";

type CensusTrendChartProps = {
  role: UserRole;
  initialDepartmentPerformance: DepartmentPerformance[];
  availableDepartments: Department[];
  initialDailyTrend: DailyTrend[];
  initialMonth: string;
  departmentId: string;
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
    const key: (typeof weeks)[number] =
      day <= 7 ? "Week 1" : day <= 14 ? "Week 2" : day <= 21 ? "Week 3" : "Week 4";
    const bucket = buckets.get(key)!;
    bucket.census_total += item.census_total;
    bucket.census_opd += item.census_opd;
    bucket.census_er += item.census_er;
  });
  return Array.from(buckets.entries()).map(([name, vals]) => ({ name, ...vals }));
}

export default function CensusTrendChart({
  role,
  initialDepartmentPerformance,
  availableDepartments,
  initialDailyTrend,
  initialMonth,
  departmentId,
}: CensusTrendChartProps) {
  const isLeadership = role === "avp" || role === "division_head";
  const [chartMonth, setChartMonth] = useState(initialMonth);
  const [censusView, setCensusView] = useState<"total" | "breakdown">("total");
  const [censusTimeframe, setCensusTimeframe] = useState<"monthly" | "yearly">("monthly");

  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>(initialDailyTrend);
  const [deptPerformance, setDeptPerformance] = useState<DepartmentPerformance[]>(initialDepartmentPerformance);
  const [yearlyDeptCensus, setYearlyDeptCensus] = useState<DepartmentPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingYearlyCensus, setLoadingYearlyCensus] = useState(false);

  const [prevInitialMonth, setPrevInitialMonth] = useState(initialMonth);
  const [prevInitialTrend, setPrevInitialTrend] = useState(initialDailyTrend);
  if (initialMonth !== prevInitialMonth) {
    setPrevInitialMonth(initialMonth);
    setPrevInitialTrend(initialDailyTrend);
    setChartMonth(initialMonth);
    setDailyTrend(initialDailyTrend);
    setDeptPerformance(initialDepartmentPerformance);
  } else if (initialDailyTrend !== prevInitialTrend && chartMonth === initialMonth) {

    setPrevInitialTrend(initialDailyTrend);
    setDailyTrend(initialDailyTrend);
    setDeptPerformance(initialDepartmentPerformance);
  }

  const fetchMonthlyData = useCallback(async (month: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (departmentId) params.set("department_id", departmentId);
      const res = await fetch(`/api/metrics/summary?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return;
      const payload = await res.json();
      setDailyTrend(payload.daily_trend ?? []);
      setDeptPerformance(payload.department_performance ?? []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    if (chartMonth !== initialMonth && censusTimeframe === "monthly") {
      void fetchMonthlyData(chartMonth);
    }
  }, [chartMonth, initialMonth, censusTimeframe, fetchMonthlyData]);

  useEffect(() => {
    if (censusTimeframe !== "yearly") return;

    async function fetchYearlyCensus() {
      setLoadingYearlyCensus(true);
      const year = chartMonth.split("-")[0];
      const currentMonth = parseInt(chartMonth.split("-")[1], 10);
      const aggregated = new Map<string, DepartmentPerformance>();

      try {
        const fetches = Array.from({ length: currentMonth }, (_, i) => {
          const m = `${year}-${String(i + 1).padStart(2, "0")}`;
          const params = new URLSearchParams({ month: m });
          if (departmentId) params.set("department_id", departmentId);
          return fetch(`/api/metrics/summary?${params.toString()}`, {
            method: "GET",
            credentials: "include",
          });
        });

        const responses = await Promise.all(fetches);

        for (const res of responses) {
          if (!res.ok) continue;
          const payload = await res.json();
          const perfs = (payload.department_performance ?? []) as DepartmentPerformance[];
          for (const dp of perfs) {
            const existing = aggregated.get(dp.department_id);
            if (existing) {
              existing.census_total += dp.census_total;
              existing.census_opd += dp.census_opd;
              existing.census_er += dp.census_er;
            } else {
              aggregated.set(dp.department_id, { ...dp });
            }
          }
        }

        setYearlyDeptCensus(
          Array.from(aggregated.values())
            .filter((d) => d.census_total > 0)
            .sort((a, b) => b.census_total - a.census_total),
        );
      } catch {
        setYearlyDeptCensus([]);
      } finally {
        setLoadingYearlyCensus(false);
      }
    }

    void fetchYearlyCensus();
  }, [censusTimeframe, chartMonth, departmentId]);

  function handleMonthChange(month: string) {
    setChartMonth(month);
  }

  const codeMap = useMemo(
    () => new Map(availableDepartments.map((d) => [d.id, d.code])),
    [availableDepartments],
  );

  const leadershipMonthly = useMemo(
    () =>
      deptPerformance
        .filter((d) => d.census_total > 0)
        .map((d) => ({
          name: codeMap.get(d.department_id) ?? d.department_name.slice(0, 6),
          fullName: d.department_name,
          census_total: d.census_total,
          census_opd: d.census_opd,
          census_er: d.census_er,
        })),
    [deptPerformance, codeMap],
  );

  const leadershipYearly = useMemo(
    () =>
      yearlyDeptCensus.map((d) => ({
        name: codeMap.get(d.department_id) ?? d.department_name.slice(0, 6),
        fullName: d.department_name,
        census_total: d.census_total,
        census_opd: d.census_opd,
        census_er: d.census_er,
      })),
    [yearlyDeptCensus, codeMap],
  );

  const weeklyData = useMemo(() => groupDailyByWeek(dailyTrend), [dailyTrend]);

  const leadershipData = censusTimeframe === "yearly" ? leadershipYearly : leadershipMonthly;
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
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => handleMonthChange(shiftMonth(chartMonth, -1))}
              className="rounded-md p-0.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-200 hover:text-zinc-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-xs font-medium text-zinc-700">
              {censusTimeframe === "yearly"
                ? chartMonth.split("-")[0]
                : formatMonthLabel(chartMonth)}
            </span>
            <button
              type="button"
              onClick={() => handleMonthChange(shiftMonth(chartMonth, 1))}
              className="rounded-md p-0.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-200 hover:text-zinc-700"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {isLeadership && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              {(["monthly", "yearly"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setCensusTimeframe(tf)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
                    censusTimeframe === tf
                      ? "bg-blue-800 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {tf === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          )}
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
            {isLeadership ? "By Department" : "Weekly Breakdown"}
          </span>
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        {(["total", "breakdown"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setCensusView(v)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
              censusView === v ? "bg-blue-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
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

      <div className="h-64 min-h-64 rounded-xl border border-zinc-100 bg-zinc-50 p-2">
        {loading || loadingYearlyCensus ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              barCategoryGap="25%"
            >
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