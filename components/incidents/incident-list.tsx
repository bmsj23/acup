"use client";

import {
  CalendarDays,
  CheckCircle,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import Select from "@/components/ui/select";
import type { DepartmentItem, IncidentItem, Pagination } from "./types";
import { DEPT_CODE_LABELS } from "./utils";

type IncidentListProps = {
  role: "avp" | "division_head" | "department_head";
  incidents: IncidentItem[];
  pagination: Pagination;
  search: string;
  statusFilter: string;
  departmentFilter: string;
  loading: boolean;
  error: string | null;
  departments: DepartmentItem[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onOpenIncident: (id: string) => void;
  onCreateNew: () => void;
};

export default function IncidentList({
  role,
  incidents,
  pagination,
  search,
  statusFilter,
  departmentFilter,
  loading,
  error,
  departments,
  onSearchChange,
  onStatusFilterChange,
  onDepartmentFilterChange,
  onPageChange,
  onOpenIncident,
  onCreateNew,
}: IncidentListProps) {
  return (
    <div className="w-full space-y-6">
      {/* header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-900">
            Incident Reports
          </h1>
          {pagination.total > 0 && (
            <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
              {pagination.total}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-blue-900"
        >
          <Plus className="h-4 w-4" />
          New Incident Report
        </button>
      </div>

      {/* filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={[
            { value: "all", label: "All Status" },
            { value: "unresolved", label: "Unresolved" },
            { value: "resolved", label: "Resolved" },
          ]}
        />

        {role !== "department_head" && (
          <Select
            value={departmentFilter}
            onChange={onDepartmentFilterChange}
            options={[
              { value: "all", label: "All Departments" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* incidents list */}
      {loading && incidents.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-600">Loading incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <Shield className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm text-zinc-600">No incident reports found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <button
              key={incident.id}
              type="button"
              onClick={() => void onOpenIncident(incident.id)}
              className={`group w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:cursor-pointer hover:shadow-md ${
                incident.is_resolved
                  ? "border-zinc-200"
                  : "border-l-4 border-l-red-500 border-t-zinc-200 border-r-zinc-200 border-b-zinc-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        incident.is_resolved
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {incident.is_resolved ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {incident.is_resolved ? "Resolved" : "Unresolved"}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {incident.departments?.name ??
                        DEPT_CODE_LABELS[incident.departments?.code ?? ""] ??
                        "Unknown"}
                    </span>
                    {incident.file_name && (
                      <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm text-zinc-800">
                    <span className="font-medium text-zinc-600">Situation: </span>
                    {incident.sbar_situation}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {incident.date_of_incident} at {incident.time_of_incident}
                    </span>
                    <span>
                      Reported by{" "}
                      {incident.departments?.name ?? "Unknown Department"}
                    </span>
                  </div>
                </div>

                <FileText className="h-5 w-5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
          <p className="text-xs text-zinc-500">
            Page {pagination.page} of {pagination.total_pages} ({pagination.total}{" "}
            total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}