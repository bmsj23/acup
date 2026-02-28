"use client";

import { useCallback, useEffect, useState } from "react";
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

type TopDepartmentsChartProps = {
  initialTopPerf: DepartmentPerformance[];
  initialMonth: string;
  departmentId: string;
};

export default function TopDepartmentsChart({
  initialTopPerf,
  initialMonth,
  departmentId,
}: TopDepartmentsChartProps) {
  const [chartMonth, setChartMonth] = useState(initialMonth);
  const [timeframe, setTimeframe] = useState<"monthly" | "yearly">("monthly");
  const [topPerf, setTopPerf] = useState<DepartmentPerformance[]>(initialTopPerf);
  const [yearlyPerf, setYearlyPerf] = useState<DepartmentPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingYearly, setLoadingYearly] = useState(false);
  const [prevInitialMonth, setPrevInitialMonth] = useState(initialMonth);
  const [prevInitialPerf, setPrevInitialPerf] = useState(initialTopPerf);
  if (initialMonth !== prevInitialMonth) {
    setPrevInitialMonth(initialMonth);
    setPrevInitialPerf(initialTopPerf);
    setChartMonth(initialMonth);
    setTopPerf(initialTopPerf);
  } else if (initialTopPerf !== prevInitialPerf && chartMonth === initialMonth) {
    setPrevInitialPerf(initialTopPerf);
    setTopPerf(initialTopPerf);
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
      setTopPerf(
        ((payload.department_performance ?? []) as DepartmentPerformance[])
          .sort((a: DepartmentPerformance, b: DepartmentPerformance) => b.revenue_total - a.revenue_total)
          .slice(0, 5),
      );
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
      setLoadingYearly(true);
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

        setYearlyPerf(
          Array.from(aggregated.values()).sort((a, b) => b.revenue_total - a.revenue_total),
        );
      } catch {
        setYearlyPerf([]);
      } finally {
        setLoadingYearly(false);
      }
    }

    void fetchYearly();
  }, [timeframe, chartMonth, departmentId]);

  function handleMonthChange(month: string) {
    setChartMonth(month);
  }

  const displayData = (timeframe === "yearly" ? yearlyPerf : topPerf).slice(0, 5);
  const isLoading = (timeframe === "monthly" && loading) || (timeframe === "yearly" && loadingYearly);

  return (
    <section>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-zinc-900">Top Departments</h3>
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
                {timeframe === "yearly"
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
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : displayData.length > 0 ? (
          <div className="h-72 min-h-72">
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
        ) : (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
            No department data available
          </div>
        )}
      </div>
    </section>
  );
}