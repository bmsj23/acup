"use client";

import { AlertTriangle, Hospital, Landmark, Users } from "lucide-react";
import type { DashboardOverviewResponse } from "@/types/monitoring";
import StatCard from "./stat-card";
import { computeTrend, formatCurrency, formatInteger } from "./utils";

type DashboardSummaryGridProps = {
  overview: DashboardOverviewResponse | null;
};

export default function DashboardSummaryGrid({
  overview,
}: DashboardSummaryGridProps) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <div
        className="relative flex h-full flex-col rounded-2xl p-6 transition-all hover:border-zinc-300 hover:shadow-lg"
        style={{ backgroundColor: "#002366" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white">Total Revenue</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              {overview ? formatCurrency(overview.totals.revenue_total) : "-"}
            </h2>
          </div>
          <div className="rounded-xl bg-white/20 p-2.5">
            <Landmark className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mt-4 min-h-6">
          {overview?.previous_totals ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
              <span className="text-[11px]">
                {
                  computeTrend(
                    overview.totals.revenue_total,
                    overview.previous_totals.revenue_total,
                  )?.label
                }
              </span>
              <span className="ml-1 text-[11px] text-sky-100/80">vs last month</span>
            </div>
          ) : null}
        </div>
      </div>

      <StatCard
        title="Total Census"
        value={overview ? formatInteger(overview.totals.census_total) : "-"}
        subValue={`OPD: ${overview?.totals.census_opd ?? "-"} | ER: ${overview?.totals.census_er ?? "-"}`}
        icon={Users}
        iconColor="text-blue-800 bg-blue-50"
        trend={
          overview?.previous_totals
            ? computeTrend(
                overview.totals.census_total,
                overview.previous_totals.census_total,
              )?.label
            : undefined
        }
        trendUp={
          overview?.previous_totals
            ? computeTrend(
                overview.totals.census_total,
                overview.previous_totals.census_total,
              )?.up
            : undefined
        }
      />

      <StatCard
        title="Open Incidents"
        value={overview ? formatInteger(overview.totals.open_incidents_count) : "-"}
        icon={AlertTriangle}
        iconColor="text-red-700 bg-red-50"
        subValue="Unresolved cases requiring follow-up"
      />

      <StatCard
        title="Equipment Utilization"
        value={
          overview
            ? `${overview.totals.equipment_utilization_pct.toFixed(1)}%`
            : "-"
        }
        icon={Hospital}
        iconColor="text-blue-800 bg-blue-50"
        trend={
          overview?.previous_totals
            ? computeTrend(
                overview.totals.equipment_utilization_pct,
                overview.previous_totals.equipment_utilization_pct,
              )?.label
            : undefined
        }
        trendUp={
          overview?.previous_totals
            ? computeTrend(
                overview.totals.equipment_utilization_pct,
                overview.previous_totals.equipment_utilization_pct,
              )?.up
            : undefined
        }
      />
    </section>
  );
}
