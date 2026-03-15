"use client";

import { Shield } from "lucide-react";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import WorkspaceEmptyState from "@/components/workspace/workspace-empty-state";
import WorkspacePanel from "@/components/workspace/workspace-panel";
import IncidentFilterBar from "./incident-filter-bar";
import IncidentListHero from "./incident-list-hero";
import type { DepartmentItem, IncidentItem, Pagination } from "./types";
import IncidentListItem from "./incident-list-item";
import IncidentPagination from "./incident-pagination";

type IncidentListProps = {
  role: "avp" | "division_head" | "department_head";
  incidents: IncidentItem[];
  pagination: Pagination;
  search: string;
  resolutionFilter: "open" | "resolved" | "all";
  incidentTypeFilter: string;
  departmentFilter: string;
  selectedMonth: string;
  monthFilterActive: boolean;
  loading: boolean;
  error: string | null;
  departments: DepartmentItem[];
  currentMonth: string;
  onMonthChange: (value: string) => void;
  onClearMonthFilter: () => void;
  onSearchChange: (value: string) => void;
  onResolutionFilterChange: (value: "open" | "resolved" | "all") => void;
  onIncidentTypeFilterChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onApplyQuickFilter: (value: "open" | "current_month" | "all") => void;
  onPageChange: (page: number) => void;
  onOpenIncident: (id: string) => void;
  onCreateNew: () => void;
};

function formatMonthLabel(month: string) {
  const [year, monthValue] = month.split("-").map(Number);
  const date = new Date(year, monthValue - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function IncidentList({
  role,
  incidents,
  pagination,
  search,
  resolutionFilter,
  incidentTypeFilter,
  departmentFilter,
  selectedMonth,
  monthFilterActive,
  loading,
  error,
  departments,
  currentMonth,
  onMonthChange,
  onClearMonthFilter,
  onSearchChange,
  onResolutionFilterChange,
  onIncidentTypeFilterChange,
  onDepartmentFilterChange,
  onApplyQuickFilter,
  onPageChange,
  onOpenIncident,
  onCreateNew,
}: IncidentListProps) {
  const departmentLabel =
    departmentFilter === "all"
      ? "All departments"
      : departments.find((department) => department.id === departmentFilter)?.name
        ?? "Selected department";
  const scopeLabel =
    resolutionFilter === "open"
      ? "Open incidents"
      : resolutionFilter === "resolved"
        ? "Resolved incidents"
        : "All incidents";
  const quickFilterState = {
    open: resolutionFilter === "open" && !monthFilterActive,
    currentMonth:
      resolutionFilter === "all"
      && monthFilterActive
      && selectedMonth === currentMonth,
    all: resolutionFilter === "all" && !monthFilterActive,
  };

  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <IncidentListHero
        paginationTotal={pagination.total}
        scopeLabel={scopeLabel}
        monthFilterActive={monthFilterActive}
        selectedMonthLabel={formatMonthLabel(selectedMonth)}
        departmentLabel={departmentLabel}
        onCreateNew={onCreateNew}
      />

      <IncidentFilterBar
        role={role}
        search={search}
        resolutionFilter={resolutionFilter}
        incidentTypeFilter={incidentTypeFilter}
        departmentFilter={departmentFilter}
        departments={departments}
        selectedMonth={selectedMonth}
        monthFilterActive={monthFilterActive}
        quickFilterState={quickFilterState}
        onSearchChange={onSearchChange}
        onResolutionFilterChange={onResolutionFilterChange}
        onIncidentTypeFilterChange={onIncidentTypeFilterChange}
        onDepartmentFilterChange={onDepartmentFilterChange}
        onMonthChange={onMonthChange}
        onClearMonthFilter={onClearMonthFilter}
        onApplyQuickFilter={onApplyQuickFilter}
        formatMonthLabel={formatMonthLabel}
      />

      {error ? <InlineErrorBanner message={error} severity="critical" /> : null}

      {loading && incidents.length === 0 ? (
        <WorkspacePanel className="p-5">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-[1.8rem] bg-white/90 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.14)]"
              />
            ))}
          </div>
        </WorkspacePanel>
      ) : incidents.length > 0 ? (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <IncidentListItem
              key={incident.id}
              incident={incident}
              onOpen={onOpenIncident}
            />
          ))}
        </div>
      ) : (
        <WorkspaceEmptyState
          icon={Shield}
          eyebrow="No matching incidents"
          title="The incident feed is clear"
          description="Adjust the filters or file a new incident report if there is a case that needs to be documented."
        />
      )}

      {pagination.total_pages > 1 ? (
        <IncidentPagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          loading={loading}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}
