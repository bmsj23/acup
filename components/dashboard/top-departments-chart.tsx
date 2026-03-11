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
} from "recharts";
import type { DepartmentPerformance } from "./types";
import { formatCurrency, formatYAxisCurrency, formatMonthLabel, shiftMonth } from "./utils";
import { usePrintableChart } from "./use-printable-chart";

type TopDepartmentsChartProps = {
  initialTopPerf: DepartmentPerformance[];
  initialMonth: string;
  departmentId: string;
  onCaptureRef?: (capture: () => Promise<void>) => void;
};

export default function TopDepartmentsChart({
  initialTopPerf,
  initialMonth,
  departmentId,
  onCaptureRef,
}: TopDepartmentsChartProps) {
  const [chartMonth, setChartMonth] = useState(initialMonth);
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

  const topPerf = useMemo(() => {
    if (chartMonth === initialMonth) return initialTopPerf;
    return ((fetchedData?.department_performance ?? []) as DepartmentPerformance[])
      .sort((a: DepartmentPerformance, b: DepartmentPerformance) => b.revenue_total - a.revenue_total)
      .slice(0, 5);
  }, [chartMonth, initialMonth, initialTopPerf, fetchedData]);

  const yearlyPerf = useMemo(() => {
    if (timeframe !== "yearly") return [];
    const aggregated = new Map<string, DepartmentPerformance>();
    for (const q of yearQueries) {
      if (!q.data) continue;
      const perfs = (q.data.department_performance ?? []) as DepartmentPerformance[];
      for (const dp of perfs) {
        const existing = aggregated.get(dp.department_id);
        if (existing) {
          existing.revenue_total += dp.revenue_total;
          existing.census_total += dp.census_total;
          existing.census_opd += dp.census_opd;
          existing.census_er += dp.census_er;
          existing.monthly_input_count += dp.monthly_input_count;
          existing.equipment_utilization_pct = (existing.equipment_utilization_pct + dp.equipment_utilization_pct) / 2;
        } else {
          aggregated.set(dp.department_id, { ...dp });
        }
      }
    }
    return Array.from(aggregated.values()).sort((a, b) => b.revenue_total - a.revenue_total);
  }, [timeframe, yearQueries]);

  function handleMonthChange(month: string) {
    setChartMonth(month);
  }

  const displayData = (timeframe === "yearly" ? yearlyPerf : topPerf).slice(0, 5);

  return (
    <section ref={printRef}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-bold text-zinc-900">Top Departments</h2>
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
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 print:hidden">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : chartReady && displayData.length > 0 ? (
          <div className="h-72 min-h-72 print:hidden">
            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
              <BarChart
                data={displayData.map((d) => ({
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
        ) : !chartReady ? (
          <div className="flex items-center justify-center py-16 print:hidden">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-600 print:hidden">
            No department data available
          </div>
        )}
        {printImageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={printImageSrc} alt="Chart print preview" className="hidden w-full print:block" />
        )}
      </div>
    </section>
  );
}