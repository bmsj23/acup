"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type RevenueTrendChartProps = {
  initialDailyTrend: DailyTrend[];
  initialMonth: string;
  departmentId: string;
};

export default function RevenueTrendChart({
  initialDailyTrend,
  initialMonth,
  departmentId,
}: RevenueTrendChartProps) {
  const [chartMonth, setChartMonth] = useState(initialMonth);
  const [chartView, setChartView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [timeframe, setTimeframe] = useState<"monthly" | "yearly">("monthly");
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>(initialDailyTrend);
  const [yearlyData, setYearlyData] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const [prevInitialMonth, setPrevInitialMonth] = useState(initialMonth);
  const [prevInitialTrend, setPrevInitialTrend] = useState(initialDailyTrend);
  if (initialMonth !== prevInitialMonth) {
    setPrevInitialMonth(initialMonth);
    setPrevInitialTrend(initialDailyTrend);
    setChartMonth(initialMonth);
    setDailyTrend(initialDailyTrend);
  } else if (initialDailyTrend !== prevInitialTrend && chartMonth === initialMonth) {
    setPrevInitialTrend(initialDailyTrend);
    setDailyTrend(initialDailyTrend);
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
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    if (chartMonth !== initialMonth && timeframe === "monthly") {
      void fetchMonthlyData(chartMonth);
    }
  }, [chartMonth, initialMonth, timeframe, fetchMonthlyData]);

  useEffect(() => {
    if (timeframe !== "yearly") return;

    async function fetchYearly() {
      setLoading(true);
      const year = chartMonth.split("-")[0];
      const currentMonth = parseInt(chartMonth.split("-")[1], 10);

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
        const monthlyRevenues: { month: string; revenue: number }[] = [];

        for (const [idx, res] of responses.entries()) {
          if (!res.ok) continue;
          const payload = await res.json();
          const trend = (payload.daily_trend ?? []) as DailyTrend[];
          const total = trend.reduce((sum, d) => sum + d.revenue_total, 0);
          monthlyRevenues.push({
            month: `${year}-${String(idx + 1).padStart(2, "0")}`,
            revenue: total,
          });
        }

        setYearlyData(monthlyRevenues);
      } catch {
        setYearlyData([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchYearly();
  }, [timeframe, chartMonth, departmentId]);

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
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-bold text-zinc-900">Revenue Trend</h2>
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
        <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
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

      <div className="h-64 min-h-64 rounded-xl border border-zinc-100 bg-zinc-50 p-2">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : revenueChartData.length > 0 ? (
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
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}