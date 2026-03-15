"use client";

import {
  CalendarDays,
  Filter,
  Search,
  X,
} from "lucide-react";
import MonthPicker from "@/components/ui/month-picker";
import Select from "@/components/ui/select";
import WorkspaceFilterBar from "@/components/workspace/workspace-filter-bar";
import type { DepartmentItem } from "./types";
import { INCIDENT_TYPE_LABELS } from "./utils";

type IncidentFilterBarProps = {
  role: "avp" | "division_head" | "department_head";
  search: string;
  resolutionFilter: "open" | "resolved" | "all";
  incidentTypeFilter: string;
  departmentFilter: string;
  departments: DepartmentItem[];
  selectedMonth: string;
  monthFilterActive: boolean;
  quickFilterState: {
    open: boolean;
    currentMonth: boolean;
    all: boolean;
  };
  onSearchChange: (value: string) => void;
  onResolutionFilterChange: (value: "open" | "resolved" | "all") => void;
  onIncidentTypeFilterChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onClearMonthFilter: () => void;
  onApplyQuickFilter: (value: "open" | "current_month" | "all") => void;
  formatMonthLabel: (value: string) => string;
};

export default function IncidentFilterBar({
  role,
  search,
  resolutionFilter,
  incidentTypeFilter,
  departmentFilter,
  departments,
  selectedMonth,
  monthFilterActive,
  quickFilterState,
  onSearchChange,
  onResolutionFilterChange,
  onIncidentTypeFilterChange,
  onDepartmentFilterChange,
  onMonthChange,
  onClearMonthFilter,
  onApplyQuickFilter,
  formatMonthLabel,
}: IncidentFilterBarProps) {
  return (
    <WorkspaceFilterBar>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onApplyQuickFilter("open")}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:cursor-pointer ${
              quickFilterState.open
                ? "bg-blue-800 text-white"
                : "border border-blue-100 bg-white text-blue-800 hover:bg-blue-50"
            }`}
          >
            Open incidents
          </button>
          <button
            type="button"
            onClick={() => onApplyQuickFilter("current_month")}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:cursor-pointer ${
              quickFilterState.currentMonth
                ? "bg-blue-800 text-white"
                : "border border-blue-100 bg-white text-blue-800 hover:bg-blue-50"
            }`}
          >
            Current month
          </button>
          <button
            type="button"
            onClick={() => onApplyQuickFilter("all")}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:cursor-pointer ${
              quickFilterState.all
                ? "bg-blue-800 text-white"
                : "border border-blue-100 bg-white text-blue-800 hover:bg-blue-50"
            }`}
          >
            All incidents
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_13rem_minmax(15rem,18rem)] md:items-end">
          <div className="relative">
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Search incidents
            </label>
            <Search className="absolute left-4 top-[calc(50%+0.4rem)] h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search the situation or background"
              className="w-full rounded-[1.2rem] border border-blue-100 bg-slate-50/70 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Resolution
            </label>
            <Select
              value={resolutionFilter}
              onChange={(value) =>
                onResolutionFilterChange(value as "open" | "resolved" | "all")
              }
              aria-label="Filter incidents by resolution"
              className="min-w-[12rem]"
              options={[
                { value: "open", label: "Open only" },
                { value: "resolved", label: "Resolved only" },
                { value: "all", label: "All incidents" },
              ]}
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Incident type
            </label>
            <Select
              value={incidentTypeFilter}
              onChange={onIncidentTypeFilterChange}
              aria-label="Filter incidents by type"
              className="min-w-[13rem]"
              options={[
                { value: "all", label: "All types" },
                ...Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </div>

          {role !== "department_head" ? (
            <div>
              <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Department
              </label>
              <Select
                value={departmentFilter}
                onChange={onDepartmentFilterChange}
                aria-label="Filter incidents by department"
                className="min-w-[16rem]"
                dropdownMinWidth={288}
                options={[
                  { value: "all", label: "All departments" },
                  ...departments.map((department) => ({
                    value: department.id,
                    label: department.name,
                  })),
                ]}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Optional month filter
            </label>
            <MonthPicker
              value={selectedMonth}
              onChange={onMonthChange}
              className="min-w-[15rem]"
            />
          </div>

          {monthFilterActive ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">
              <CalendarDays className="h-4 w-4" />
              {formatMonthLabel(selectedMonth)}
              <button
                type="button"
                onClick={onClearMonthFilter}
                className="rounded-full p-0.5 transition-colors hover:cursor-pointer hover:bg-blue-100"
                aria-label="Clear month filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-500">
              <Filter className="h-4 w-4" />
              All dates are currently visible
            </span>
          )}
        </div>
      </div>
    </WorkspaceFilterBar>
  );
}
