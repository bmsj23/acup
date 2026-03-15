"use client";

import { BarChart2, ChevronLeft, ChevronRight, Loader2, Printer } from "lucide-react";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import MonthPicker from "@/components/ui/month-picker";
import Select from "@/components/ui/select";
import { NON_REVENUE_DEPARTMENT_CODES } from "@/lib/constants/departments";
import type { DashboardOverviewResponse } from "@/types/monitoring";
import { formatMonthLabel, shiftMonth } from "./utils";

type DashboardToolbarProps = {
  role: "avp" | "division_head" | "department_head";
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedDepartmentId: string;
  onDepartmentChange: (value: string) => void;
  dashboardView: "revenue" | "non-revenue";
  onDashboardViewChange: (value: "revenue" | "non-revenue") => void;
  overview: DashboardOverviewResponse | null;
  isLeadershipRole: boolean;
  isRefreshingOverview: boolean;
  isRefreshingNonRevenue: boolean;
  dataAsOf: string | null;
  onRefresh: () => void;
  onPrint: () => void;
  isRefreshDisabled: boolean;
};

export default function DashboardToolbar({
  role,
  selectedMonth,
  onMonthChange,
  selectedDepartmentId,
  onDepartmentChange,
  dashboardView,
  onDashboardViewChange,
  overview,
  isLeadershipRole,
  isRefreshingOverview,
  isRefreshingNonRevenue,
  dataAsOf,
  onRefresh,
  onPrint,
  isRefreshDisabled,
}: DashboardToolbarProps) {
  const departmentOptions = [
    { value: "", label: "All Departments" },
    ...(overview?.filters.available_departments ?? []).map((department) => ({
      value: department.id,
      label: department.name,
    })),
  ];

  const selectedDepartmentCode = overview?.filters.available_departments.find(
    (department) => department.id === selectedDepartmentId,
  )?.code;
  const nonRevenueSelected =
    !!selectedDepartmentCode
    && NON_REVENUE_DEPARTMENT_CODES.includes(selectedDepartmentCode as never);

  const activeRefreshLabel =
    dashboardView === "non-revenue" && (isRefreshingNonRevenue || nonRevenueSelected)
      ? `Updating non-revenue view for ${formatMonthLabel(selectedMonth)}...`
      : `Updating dashboard data for ${formatMonthLabel(selectedMonth)}...`;

  return (
    <section
      data-no-print
      className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between"
    >
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(selectedMonth, -1))}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <MonthPicker value={selectedMonth} onChange={onMonthChange} />
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(selectedMonth, 1))}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {role !== "department_head" ? (
            <>
              <div className="h-4 w-px bg-zinc-200" />
              <Select
                value={selectedDepartmentId}
                onChange={onDepartmentChange}
                options={departmentOptions}
                className="min-w-45 flex-1 border-0 bg-transparent px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-none focus:border-0 focus:ring-0"
                dropdownMinWidth={420}
                aria-label="Select department"
              />
            </>
          ) : null}
        </div>

        {isLeadershipRole ? (
          <div className="flex w-full items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onDashboardViewChange("revenue")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors hover:cursor-pointer ${
                dashboardView === "revenue"
                  ? "bg-blue-800 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Revenue view
            </button>
            <button
              type="button"
              onClick={() => onDashboardViewChange("non-revenue")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors hover:cursor-pointer ${
                dashboardView === "non-revenue"
                  ? "bg-blue-800 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Non-revenue view
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          {(isRefreshingOverview || isRefreshingNonRevenue) && overview ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{activeRefreshLabel}</span>
            </>
          ) : dataAsOf ? (
            <span suppressHydrationWarning>Data as of {dataAsOf}</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrint}
          className="no-print inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:cursor-pointer hover:bg-zinc-50"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshDisabled}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:cursor-pointer hover:bg-zinc-800 disabled:cursor-not-allowed"
        >
          {isRefreshDisabled ? "Refreshing..." : "Refresh Data"}
        </button>
        {role === "department_head" ? (
          <OptimisticRouteLink
            href="/metrics"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 hover:cursor-pointer"
          >
            <BarChart2 className="h-4 w-4" />
            Update Metrics
          </OptimisticRouteLink>
        ) : null}
      </div>
    </section>
  );
}
