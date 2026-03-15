"use client";

import { BarChart2, ChevronLeft, ChevronRight, Loader2, Printer } from "lucide-react";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import MonthPicker from "@/components/ui/month-picker";
import Select from "@/components/ui/select";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
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

  const selectedDepartment = overview?.filters.available_departments.find(
    (department) => department.id === selectedDepartmentId,
  );
  const nonRevenueSelected = !getDepartmentCapabilities(selectedDepartment).supportsRevenue;

  const activeRefreshLabel =
    dashboardView === "non-revenue" && (isRefreshingNonRevenue || nonRevenueSelected)
      ? `Updating non-revenue view for ${formatMonthLabel(selectedMonth)}...`
      : `Updating dashboard data for ${formatMonthLabel(selectedMonth)}...`;

  return (
    <section
      data-no-print
      className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
    >
      <div className="min-w-0 space-y-3">
        <div className="inline-flex w-full max-w-[30rem] items-center gap-0 overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white p-1.5 shadow-sm">
          <div className="flex min-w-0 flex-[1.22] items-center">
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonth(selectedMonth, -1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <MonthPicker
                value={selectedMonth}
                onChange={onMonthChange}
                showIndicator={false}
                appearance="ghost"
                dropdownMinWidth={320}
              />
            </div>
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonth(selectedMonth, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {role !== "department_head" ? (
            <>
              <div className="mx-1 h-5 w-px bg-zinc-200" />
              <div className="min-w-0 flex-[0.9]">
                <Select
                  value={selectedDepartmentId}
                  onChange={onDepartmentChange}
                  options={departmentOptions}
                  appearance="ghost"
                  dropdownMinWidth={288}
                  aria-label="Select department"
                />
              </div>
            </>
          ) : null}
        </div>

        {isLeadershipRole ? (
          <div className="inline-flex w-full max-w-[30rem] items-center gap-1 rounded-[1.05rem] border border-zinc-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onDashboardViewChange("revenue")}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:cursor-pointer ${
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
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:cursor-pointer ${
                dashboardView === "non-revenue"
                  ? "bg-blue-800 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Non-revenue view
            </button>
          </div>
        ) : null}

        <div className="flex min-h-5 items-center gap-1.5 pl-1 text-xs text-zinc-500">
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

      <div className="flex flex-wrap gap-3 xl:justify-end">
        <button
          type="button"
          onClick={onPrint}
          className="no-print inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:cursor-pointer hover:bg-zinc-50"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshDisabled}
          className="whitespace-nowrap rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:cursor-pointer hover:bg-zinc-800 disabled:cursor-not-allowed"
        >
          {isRefreshDisabled ? "Refreshing..." : "Refresh Data"}
        </button>
        {role === "department_head" ? (
          <OptimisticRouteLink
            href="/metrics"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 hover:cursor-pointer"
          >
            <BarChart2 className="h-4 w-4" />
            Update Metrics
          </OptimisticRouteLink>
        ) : null}
      </div>
    </section>
  );
}
