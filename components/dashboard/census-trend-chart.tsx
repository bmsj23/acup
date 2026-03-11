"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
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
import { usePrintableChart } from "./use-printable-chart";

type CensusTrendChartProps = {
  role: UserRole;
  initialDepartmentPerformance: DepartmentPerformance[];
  availableDepartments: Department[];
  initialDailyTrend: DailyTrend[];
  initialMonth: string;
  departmentId: string;
  onCaptureRef?: (capture: () => Promise<void>) => void;
};

type CensusChartDatum = {
  name: string;
  census_total: number;
  census_opd: number;
  census_er: number;
  fullName?: string;
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
  onCaptureRef,
}: CensusTrendChartProps) {
  const isLeadership = role === "avp" || role === "division_head";
  const [chartMonth, setChartMonth] = useState(initialMonth);
  const [censusView, setCensusView] = useState<"total" | "breakdown">("total");
  const [censusTimeframe, setCensusTimeframe] = useState<"monthly" | "yearly">("monthly");
  const [chartReady, setChartReady] = useState(false);
  const { ref: printRef, printImageSrc, captureForPrint } = usePrintableChart();

  useEffect(() => {
    onCaptureRef?.(() => captureForPrint());
  }, [onCaptureRef, captureForPrint]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { data: fetchedData, isLoading: fetchLoading } = useQuery({
    queryKey: ["chart-metrics", chartMonth, departmentId],
    queryFn: async () => {
      const params = new URLSearchParams({ month: chartMonth });
      if (departmentId) params.set("department_id", departmentId);
      const res = await fetch(`/api/metrics/summary?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json();
    },
    enabled: chartMonth !== initialMonth && censusTimeframe === "monthly",
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const yearQueries = useQueries({
    queries: censusTimeframe === "yearly"
      ? Array.from({ length: parseInt(chartMonth.split("-")[1], 10) }, (_, i) => ({
          queryKey: ["chart-metrics", `${chartMonth.split("-")[0]}-${String(i + 1).padStart(2, "0")}`, departmentId],
          queryFn: async () => {
            const m = `${chartMonth.split("-")[0]}-${String(i + 1).padStart(2, "0")}`;
            const params = new URLSearchParams({ month: m });
            if (departmentId) params.set("department_id", departmentId);
            const res = await fetch(`/api/metrics/summary?${params.toString()}`, { method: "GET", credentials: "include" });
            if (!res.ok) throw new Error("fetch failed");
            return res.json();
          },
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
        }))
      : [],
  });

  const loading = fetchLoading || yearQueries.some(q => q.isLoading);

  const dailyTrend: DailyTrend[] = useMemo(
    () => (chartMonth === initialMonth ? initialDailyTrend : (fetchedData?.daily_trend ?? [])),
    [chartMonth, initialMonth, initialDailyTrend, fetchedData],
  );
  const deptPerformance: DepartmentPerformance[] = useMemo(
    () => (chartMonth === initialMonth ? initialDepartmentPerformance : (fetchedData?.department_performance ?? [])),
    [chartMonth, initialMonth, initialDepartmentPerformance, fetchedData],
  );

  const yearlyDeptCensus = useMemo<DepartmentPerformance[]>(() => {
    if (censusTimeframe !== "yearly") return [];
    const aggregated = new Map<string, DepartmentPerformance>();
    for (const q of yearQueries) {
      if (!q.data) continue;
      const perfs = (q.data.department_performance ?? []) as DepartmentPerformance[];
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
    return Array.from(aggregated.values())
      .filter((d: DepartmentPerformance) => d.census_total > 0)
      .sort((a, b) => b.census_total - a.census_total);
  }, [censusTimeframe, yearQueries]);

  function handleMonthChange(month: string) {
    setChartMonth(month);
  }

  const codeMap = useMemo(
    () => new Map(availableDepartments.map((d) => [d.id, d.code])),
    [availableDepartments],
  );

  const leadershipMonthly = useMemo<CensusChartDatum[]>(
    () =>
      deptPerformance
        .filter((d: DepartmentPerformance) => d.census_total > 0)
        .map((d: DepartmentPerformance) => ({
          name: codeMap.get(d.department_id) ?? d.department_name.slice(0, 6),
          fullName: d.department_name,
          census_total: d.census_total,
          census_opd: d.census_opd,
          census_er: d.census_er,
        })),
    [deptPerformance, codeMap],
  );

  const leadershipYearly = useMemo<CensusChartDatum[]>(
    () =>
      yearlyDeptCensus.map((d: DepartmentPerformance) => ({
        name: codeMap.get(d.department_id) ?? d.department_name.slice(0, 6),
        fullName: d.department_name,
        census_total: d.census_total,
        census_opd: d.census_opd,
        census_er: d.census_er,
      })),
    [yearlyDeptCensus, codeMap],
  );

  const weeklyData = useMemo<CensusChartDatum[]>(() => groupDailyByWeek(dailyTrend), [dailyTrend]);

  const leadershipData: CensusChartDatum[] =
    censusTimeframe === "yearly" ? leadershipYearly : leadershipMonthly;
  const chartData: CensusChartDatum[] = isLeadership ? leadershipData : weeklyData;
  const hasData = chartData.some((d: CensusChartDatum) => d.census_total > 0);

  const maxCensus = chartData.reduce(
    (max: number, item: CensusChartDatum) =>
      (item.census_total > max ? item.census_total : max),
    0,
  );
  const minCensus = chartData.reduce((min: number, item: CensusChartDatum) => {
    if (min === 0) return item.census_total;
    return item.census_total < min ? item.census_total : min;
  }, 0);
  const avgCensus =
    chartData.length > 0
      ? chartData.reduce(
          (total: number, item: CensusChartDatum) => total + item.census_total,
          0,
        ) / chartData.length
      : 0;

  return (
    <div ref={printRef} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-bold text-zinc-900">Census Trend</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => handleMonthChange(shiftMonth(chartMonth, -1))}
              className="rounded-md p-0.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-200 hover:text-zinc-700"
              aria-label="Previous period"
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
              aria-label="Next period"
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
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
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

      <div className="h-64 min-h-64 rounded-xl border border-zinc-100 bg-zinc-50 p-2 print:hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : chartReady && hasData ? (
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
        ) : !chartReady ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            No census data available
          </div>
        )}
      </div>
      {printImageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={printImageSrc} alt="Chart print preview" className="hidden w-full print:block" />
      )}
    </div>
  );
}