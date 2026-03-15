"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyTrend } from "./types";
import {
  formatCurrency,
  formatYAxisCurrency,
  formatMonthLabel,
  getChartViewLabel,
  getChartUnit,
  getWeekKey,
  getMonthKey,
  shiftMonth,
} from "./utils";
import { usePrintableChart } from "./use-printable-chart";

type RevenueTrendChartProps = {
  initialDailyTrend: DailyTrend[];
  initialMonth: string;
  departmentId: string;
  onCaptureRef?: (capture: () => Promise<void>) => void;
};

export default function RevenueTrendChart({
  initialDailyTrend,
  initialMonth,
  departmentId,
  onCaptureRef,
}: RevenueTrendChartProps) {
  const [chartMonth, setChartMonth] = useState(initialMonth);
  const [chartView, setChartView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [timeframe, setTimeframe] = useState<"monthly" | "yearly">("monthly");
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
    enabled: chartMonth !== initialMonth && timeframe === "monthly",
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const yearQueries = useQueries({
    queries: timeframe === "yearly"
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

  const yearlyData = useMemo(() => {
    if (timeframe !== "yearly") return [];
    const year = chartMonth.split("-")[0];
    return yearQueries
      .map((q, idx) => {
        if (!q.data) return null;
        const trend = (q.data.daily_trend ?? []) as DailyTrend[];
        const total = trend.reduce((sum: number, d: DailyTrend) => sum + d.revenue_total, 0);
        return { month: `${year}-${String(idx + 1).padStart(2, "0")}`, revenue: total };
      })
      .filter((d): d is { month: string; revenue: number } => d !== null);
  }, [timeframe, chartMonth, yearQueries]);

  function handleMonthChange(month: string) {
    setChartMonth(month);
  }

  const filteredTrend = useMemo(() => {
    if (chartView === "daily") return dailyTrend;

    if (chartView === "weekly") {
      const grouped = new Map<string, DailyTrend>();
      dailyTrend.forEach((item) => grouped.set(getWeekKey(item.date), item));
      return Array.from(grouped.values());
    }

    const grouped = new Map<string, DailyTrend>();
    dailyTrend.forEach((item) => grouped.set(getMonthKey(item.date), item));
    return Array.from(grouped.values());
  }, [chartView, dailyTrend]);

  const revenueChartData = useMemo(() => {
    if (timeframe === "yearly") {
      return yearlyData.map((d) => ({ date: d.month, revenue: d.revenue }));
    }
    return filteredTrend.map((item) => ({ date: item.date, revenue: item.revenue_total }));
  }, [timeframe, yearlyData, filteredTrend]);

  const maxRevenue = revenueChartData.reduce(
    (max, item) => (item.revenue > max ? item.revenue : max),
    0,
  );
  const minRevenue = revenueChartData.reduce((min, item) => {
    if (min === 0) return item.revenue;
    return item.revenue < min ? item.revenue : min;
  }, 0);
  const avgRevenue =
    revenueChartData.length > 0
      ? revenueChartData.reduce((total, item) => total + item.revenue, 0) / revenueChartData.length
      : 0;

  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div ref={printRef} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-bold text-zinc-900">Revenue Trend</h2>
        <div className="flex items-center gap-2 print:hidden">
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
              {timeframe === "yearly"
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
          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            {(["monthly", "yearly"] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
                  timeframe === tf ? "bg-blue-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {tf === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          {timeframe === "monthly" && (
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              {getChartViewLabel(chartView)} View &bull; {filteredTrend.length} {getChartUnit(chartView)}
            </span>
          )}
        </div>
      </div>

      {timeframe === "monthly" && (
        <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 print:hidden">
          {(["daily", "weekly", "monthly"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setChartView(v)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:cursor-pointer ${
                chartView === v ? "bg-blue-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {getChartViewLabel(v)}
            </button>
          ))}
        </div>
      )}

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

      <div ref={printRef} className="h-64 min-h-64 rounded-xl border border-zinc-100 bg-zinc-50 p-2 print:hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : chartReady && revenueChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
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
                tickFormatter={(d: string) => {
                  if (timeframe === "yearly") {
                    const m = parseInt(d.split("-")[1], 10);
                    return MONTHS_SHORT[m - 1] ?? d;
                  }
                  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                }}
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
                labelFormatter={(label: unknown) => {
                  if (timeframe === "yearly") {
                    const m = parseInt((label as string).split("-")[1], 10);
                    return MONTHS_SHORT[m - 1] ?? (label as string);
                  }
                  return new Date(label as string).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  });
                }}
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
        ) : !chartReady ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            No data available
          </div>
        )}
      </div>
      {printImageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={printImageSrc} alt="Chart print preview" className="hidden w-full rounded-xl border border-zinc-100 print:block" />
      )}
    </div>
  );
}
