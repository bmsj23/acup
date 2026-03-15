"use client";

import { Activity, AlertTriangle, FileText, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonthLabel } from "@/components/dashboard/utils";
import type { NonRevenueSummaryResponse } from "./types";
import StatCard from "./stat-card";

type NonRevenueSectionProps = {
  selectedMonth: string;
  summary: NonRevenueSummaryResponse | null;
  loading: boolean;
  isFetching: boolean;
};

export default function NonRevenueSection({
  selectedMonth,
  summary,
  loading,
  isFetching,
}: NonRevenueSectionProps) {
  const chartData = (summary?.category_summary ?? []).map((item) => ({
    name:
      item.category.length > 28
        ? `${item.category.slice(0, 25)}...`
        : item.category,
    fullName: item.category,
    count: item.total_count,
  }));

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
        <p className="text-sm text-zinc-500">Loading non-revenue dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Transactions"
          value={(summary?.totals.transaction_total ?? 0).toLocaleString()}
          icon={FileText}
          iconColor="text-blue-800 bg-blue-50"
          subValue={`${formatMonthLabel(selectedMonth)} category volume`}
        />
        <StatCard
          title="Medication Errors"
          value={(summary?.totals.medication_error_count ?? 0).toLocaleString()}
          icon={AlertTriangle}
          iconColor="text-amber-700 bg-amber-50"
          subValue="Clinical pharmacy entries"
        />
        <StatCard
          title="Transaction Categories"
          value={(summary?.totals.category_count ?? 0).toLocaleString()}
          icon={Activity}
          iconColor="text-violet-700 bg-violet-50"
          subValue={isFetching ? "Refreshing quietly..." : "Current month categories"}
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-zinc-900">
              Medical records transaction categories
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {formatMonthLabel(selectedMonth)} distribution across encoded non-revenue entries.
            </p>
          </div>
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
            {(summary?.totals.category_count ?? 0).toLocaleString()} categories
            {" "}•{" "}
            {(summary?.totals.transaction_total ?? 0).toLocaleString()} total
          </span>
        </div>

        {chartData.length > 0 ? (
          <div
            className="rounded-xl border border-zinc-100 bg-zinc-50 p-2"
            style={{ height: Math.max(220, chartData.length * 48 + 40) }}
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
                  formatter={(value: unknown) => [
                    (value as number).toLocaleString(),
                    "Count",
                  ]}
                  labelFormatter={(label: unknown) => {
                    const key = label as string;
                    return chartData.find((item) => item.name === key)?.fullName ?? key;
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
          <p className="text-sm text-zinc-500">
            No non-revenue transaction data is available for this month.
          </p>
        )}
      </section>
    </div>
  );
}
