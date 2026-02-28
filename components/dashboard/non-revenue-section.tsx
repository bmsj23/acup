"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatCard from "./stat-card";
import { formatMonthLabel, shiftMonth } from "./utils";

type TransactionSummaryItem = {
  category: string;
  total_count: number;
};

type NonRevenueSectionProps = {
  selectedMonth: string;
};

export default function NonRevenueSection({ selectedMonth }: NonRevenueSectionProps) {
  const [chartMonth, setChartMonth] = useState(selectedMonth);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummaryItem[]>([]);
  const [medicationErrors, setMedicationErrors] = useState(0);
  const [loadingNonRev, setLoadingNonRev] = useState(true);

  const [prevSelectedMonth, setPrevSelectedMonth] = useState(selectedMonth);
  if (selectedMonth !== prevSelectedMonth) {
    setPrevSelectedMonth(selectedMonth);
    setChartMonth(selectedMonth);
  }

  useEffect(() => {
    async function fetchData() {
      setLoadingNonRev(true);

      try {
        const [year, month] = chartMonth.split("-").map(Number);
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const txParams = new URLSearchParams();
        txParams.set("start_date", startDate);
        txParams.set("end_date", endDate);

        const txRes = await fetch(`/api/transaction-categories?${txParams.toString()}`, {
          method: "GET",
          credentials: "include",
        });

        if (txRes.ok) {
          const txPayload = await txRes.json();
          const entries = (txPayload.data ?? []) as { category: string; count: number }[];

          const categoryMap = new Map<string, number>();
          entries.forEach((entry) => {
            categoryMap.set(
              entry.category,
              (categoryMap.get(entry.category) ?? 0) + entry.count,
            );
          });

          setTransactionSummary(
            Array.from(categoryMap.entries())
              .map(([category, total_count]) => ({ category, total_count }))
              .sort((a, b) => b.total_count - a.total_count),
          );
        }

        const metricsRes = await fetch(`/api/metrics/summary?month=${chartMonth}`, {
          method: "GET",
          credentials: "include",
        });

        if (metricsRes.ok) {
          const metricsPayload = await metricsRes.json();
          const trend = (metricsPayload.daily_trend ?? []) as { medication_error_count?: number }[];
          const totalErrors = trend.reduce(
            (sum, d) => sum + (d.medication_error_count ?? 0),
            0,
          );
          setMedicationErrors(totalErrors);
        }
      } catch {
        //
      } finally {
        setLoadingNonRev(false);
      }
    }

    void fetchData();
  }, [chartMonth]);

  const grandTotal = transactionSummary.reduce((sum, item) => sum + item.total_count, 0);

  const chartData = transactionSummary.map((item) => ({
    name: item.category.length > 30 ? item.category.slice(0, 28) + "..." : item.category,
    fullName: item.category,
    count: item.total_count,
  }));

  if (loadingNonRev) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
        <p className="text-sm text-zinc-500">Loading non-revenue data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Transactions (Medical Records)"
          value={grandTotal.toLocaleString()}
          icon={FileText}
          iconColor="text-blue-800 bg-blue-50"
        />
        <StatCard
          title="Medication Errors (Clinical Pharmacy)"
          value={medicationErrors.toLocaleString()}
          icon={AlertTriangle}
          iconColor="text-amber-700 bg-amber-50"
        />
        <StatCard
          title="Transaction Categories"
          value={transactionSummary.length.toLocaleString()}
          icon={Activity}
          iconColor="text-blue-800 bg-blue-50"
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-zinc-900">
            Medical Records - Transaction Categories
          </h3>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              <button
                type="button"
                onClick={() => setChartMonth(shiftMonth(chartMonth, -1))}
                className="rounded-md p-0.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-200 hover:text-zinc-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 text-xs font-medium text-zinc-700">
                {formatMonthLabel(chartMonth)}
              </span>
              <button
                type="button"
                onClick={() => setChartMonth(shiftMonth(chartMonth, 1))}
                className="rounded-md p-0.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-200 hover:text-zinc-700"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
              {transactionSummary.length} categories &bull; {grandTotal.toLocaleString()} total
            </span>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div
            className="rounded-xl border border-zinc-100 bg-zinc-50 p-2"
            style={{ height: Math.max(200, chartData.length * 48 + 40) }}
          >
            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#3f3f46" }}
                  tickLine={false}
                  axisLine={false}
                  width={220}
                />
                <Tooltip
                  formatter={(value: unknown) => [(value as number).toLocaleString(), "Count"]}
                  labelFormatter={(label: unknown) => {
                    const key = label as string;
                    return chartData.find((d) => d.name === key)?.fullName ?? key;
                  }}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="count" fill="#356ab7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No transaction data available for this month.</p>
        )}
      </section>
    </div>
  );
}