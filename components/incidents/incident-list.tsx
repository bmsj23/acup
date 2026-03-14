"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle,
  Paperclip,
  Plus,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import Select from "@/components/ui/select";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
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

function formatDateTime(dateValue: string, timeValue: string) {
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) {
    return `${dateValue} ${timeValue}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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
  const unresolvedCount = incidents.filter((incident) => !incident.is_resolved).length;
  const attachmentCount = incidents.filter((incident) => Boolean(incident.file_name)).length;

  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.18)]">
        <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.25fr)_24rem] xl:items-start">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Incident command center
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 [font-family:var(--font-playfair)] md:text-[3.2rem]">
              Clinical incident reports
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600">
              Review newly filed incidents, monitor active cases, and move reports through a calmer, more structured healthcare workflow.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Active on screen
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{pagination.total}</p>
                <p className="mt-1 text-sm text-slate-600">Matching the current filters.</p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Unresolved
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{unresolvedCount}</p>
                <p className="mt-1 text-sm text-slate-600">Open items needing follow-through.</p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  With evidence
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{attachmentCount}</p>
                <p className="mt-1 text-sm text-slate-600">Reports carrying attached records.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-40px_rgba(30,64,175,0.16)] backdrop-blur-sm">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                Workspace action
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                File a new report
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Capture a structured SBAR incident with optional clinical evidence attachment.
              </p>
            </div>

            <button
              type="button"
              onClick={onCreateNew}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-800 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_22px_40px_-28px_rgba(30,64,175,0.45)] transition-colors hover:cursor-pointer hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              New incident report
            </button>

            <div className="mt-5 rounded-[1.35rem] border border-blue-100/80 bg-blue-50/55 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Access scope
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {role === "department_head"
                  ? "Department-level reporting view. Focus on incidents relevant to your unit."
                  : "Leadership reporting view. Review incidents across departments and monitor closure status."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)] backdrop-blur-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_13rem] md:items-end">
          <div className="relative">
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Search cases
            </label>
            <Search className="absolute left-4 top-[calc(50%+0.4rem)] h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search situation, context, or report details"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-[1.2rem] border border-blue-100 bg-slate-50/70 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Status
            </label>
            <Select
              value={statusFilter}
              onChange={onStatusFilterChange}
              aria-label="Filter incidents by status"
              options={[
                { value: "all", label: "All Status" },
                { value: "unresolved", label: "Unresolved" },
                { value: "resolved", label: "Resolved" },
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
                options={[
                  { value: "all", label: "All Departments" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
          ) : null}
        </div>
      </section>

      {error ? <InlineErrorBanner message={error} severity="critical" /> : null}

      {loading && incidents.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[1.8rem] border border-blue-100/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.16)]"
            >
              <div className="animate-pulse">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="h-7 w-28 rounded-full bg-blue-100/85" />
                      <div className="h-7 w-36 rounded-full bg-blue-50" />
                      <div className="h-7 w-24 rounded-full bg-blue-50" />
                    </div>
                    <div className="mt-4">
                      <div className="h-3 w-28 rounded-full bg-slate-100" />
                      <div className="mt-3 h-4 w-full rounded-full bg-blue-100/80" />
                      <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {Array.from({ length: 3 }).map((__, metaIndex) => (
                        <div key={metaIndex} className="h-24 rounded-[1.2rem] bg-blue-50/60" />
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-end justify-between gap-4 lg:w-52 lg:flex-col lg:items-end">
                    <div className="h-4 w-28 rounded-full bg-slate-100" />
                    <div className="h-4 w-32 rounded-full bg-blue-100/80" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-blue-100/75 bg-white/95 py-24 text-center shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
          <Shield className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            No matching reports
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            Your incident board is clear
          </h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
            Adjust the filters or file a new incident report to begin documenting a case.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const resolved = incident.is_resolved;
            const departmentLabel =
              incident.departments?.name ??
              DEPT_CODE_LABELS[incident.departments?.code ?? ""] ??
              "Unknown Department";

            return (
              <button
                key={incident.id}
                type="button"
                onClick={() => void onOpenIncident(incident.id)}
                className="group relative w-full overflow-hidden rounded-[1.8rem] border border-blue-100/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-5 text-left shadow-[0_24px_60px_-42px_rgba(30,64,175,0.16)] transition-all duration-300 hover:cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-44px_rgba(30,64,175,0.22)]"
              >
                <div
                  className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${
                    resolved ? "bg-blue-400/80" : "bg-blue-700/80"
                  }`}
                />

                <div className="flex flex-col gap-5 pl-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] ${
                          resolved
                            ? "bg-blue-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {resolved ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {resolved ? "Resolved" : "Unresolved"}
                      </span>
                      <span className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blue-700">
                        {departmentLabel}
                      </span>
                      {incident.file_name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blue-700">
                          <Paperclip className="h-3.5 w-3.5" />
                          Attachment
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Situation overview
                      </p>
                      <p className="mt-2 max-w-4xl text-base leading-8 text-slate-800">
                        {incident.sbar_situation}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1.2rem] border border-blue-100/80 bg-blue-50/40 p-3.5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Event time
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatDateTime(incident.date_of_incident, incident.time_of_incident)}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-blue-100/80 bg-blue-50/40 p-3.5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Department
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {departmentLabel}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-blue-100/80 bg-blue-50/40 p-3.5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Review state
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {resolved ? "Closed with notes" : "Awaiting resolution"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-end justify-between gap-4 lg:w-52 lg:flex-col lg:items-end">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{incident.date_of_reporting}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
                      Open incident
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {pagination.total_pages > 1 ? (
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))] px-5 py-4 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.14)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-900">{pagination.page}</span> of{" "}
            <span className="font-semibold text-slate-900">{pagination.total_pages}</span>
            {" "}with {pagination.total} total reports.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:cursor-pointer hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:cursor-pointer hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
