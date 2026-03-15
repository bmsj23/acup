"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  FilterX,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  AUDIT_LOG_PAGE_SIZE,
  buildAuditLogsQueryString,
  getAuditLogsQueryKey,
} from "@/components/admin/audit-log-query";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import Select from "@/components/ui/select";
import WorkspaceEmptyState from "@/components/workspace/workspace-empty-state";
import WorkspaceFilterBar from "@/components/workspace/workspace-filter-bar";
import WorkspacePanel from "@/components/workspace/workspace-panel";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";

type AuditLogProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type AuditLogEntry = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  performed_at: string;
  profiles: AuditLogProfile | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "INSERT", label: "INSERT" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
  { value: "VIEW", label: "VIEW" },
  { value: "DOWNLOAD", label: "DOWNLOAD" },
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
  { value: "ACCESS_DENIED", label: "ACCESS_DENIED" },
];

const TABLE_OPTIONS = [
  { value: "", label: "All Tables" },
  { value: "announcements", label: "announcements" },
  { value: "department_metrics_daily", label: "department_metrics_daily" },
  { value: "department_productivity_monthly", label: "department_productivity_monthly" },
  { value: "departments", label: "departments" },
  { value: "equipment_assets", label: "equipment_assets" },
  { value: "equipment_utilization_monthly", label: "equipment_utilization_monthly" },
  { value: "incidents", label: "incidents" },
  { value: "profiles", label: "profiles" },
  { value: "training_compliance_monthly", label: "training_compliance_monthly" },
  { value: "training_modules", label: "training_modules" },
  { value: "transaction_category_entries", label: "transaction_category_entries" },
];

const ACTION_BADGE: Record<string, string> = {
  INSERT: "border-green-200 bg-green-50 text-green-700",
  UPDATE: "border-amber-200 bg-amber-50 text-amber-700",
  DELETE: "border-red-200 bg-red-50 text-red-700",
  VIEW: "border-zinc-200 bg-zinc-50 text-zinc-600",
  DOWNLOAD: "border-blue-200 bg-blue-50 text-blue-700",
  LOGIN: "border-indigo-200 bg-indigo-50 text-indigo-700",
  LOGOUT: "border-zinc-200 bg-zinc-50 text-zinc-600",
  ACCESS_DENIED: "border-red-200 bg-red-50 text-red-700",
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTableName(tableName: string) {
  return tableName
    .split("_")
    .map((segment) =>
      segment.length > 0 ? segment[0].toUpperCase() + segment.slice(1) : segment,
    )
    .join(" ");
}

function formatRecordId(recordId: string | null) {
  if (!recordId) {
    return "No record";
  }

  return recordId.length <= 16 ? recordId : `${recordId.slice(0, 16)}...`;
}

function countFilters(values: Array<string>) {
  return values.filter((value) => value.trim().length > 0).length;
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <WorkspacePanel className="p-5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </WorkspacePanel>
  );
}

function DiffView({
  action,
  oldData,
  newData,
}: {
  action: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  if (action === "UPDATE") {
    const oldMap = new Map(Object.entries(oldData ?? {}));
    const newMap = new Map(Object.entries(newData ?? {}));
    const allKeys = Array.from(new Set([...oldMap.keys(), ...newMap.keys()]));
    const changedKeys = allKeys.filter(
      (key) => JSON.stringify(oldMap.get(key)) !== JSON.stringify(newMap.get(key)),
    );

    if (changedKeys.length === 0) {
      return <p className="text-xs italic text-slate-500">No field changes detected.</p>;
    }

    return (
      <div className="overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white font-mono text-xs">
        {changedKeys.map((key) => (
          <div key={key} className="border-b border-zinc-100 last:border-0">
            <div className="bg-zinc-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {key}
            </div>
            {oldMap.has(key) ? (
              <div className="flex items-start gap-2 bg-red-50 px-4 py-3 text-red-800">
                <span className="shrink-0 font-bold text-red-500">-</span>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(oldMap.get(key), null, 2)}
                </pre>
              </div>
            ) : null}
            {newMap.has(key) ? (
              <div className="flex items-start gap-2 bg-green-50 px-4 py-3 text-green-800">
                <span className="shrink-0 font-bold text-green-500">+</span>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(newMap.get(key), null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (action === "INSERT" && newData) {
    return (
      <div className="overflow-hidden rounded-[1.35rem] border border-green-200 bg-white font-mono text-xs">
        {Object.entries(newData).map(([key, value]) => (
          <div
            key={key}
            className="flex items-start gap-2 border-b border-green-100 bg-green-50 px-4 py-3 text-green-800 last:border-0"
          >
            <span className="shrink-0 font-bold text-green-500">+</span>
            <span className="mr-2 font-semibold text-green-700">{key}:</span>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  if (action === "DELETE" && oldData) {
    return (
      <div className="overflow-hidden rounded-[1.35rem] border border-red-200 bg-white font-mono text-xs">
        {Object.entries(oldData).map(([key, value]) => (
          <div
            key={key}
            className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-4 py-3 text-red-800 last:border-0"
          >
            <span className="shrink-0 font-bold text-red-500">-</span>
            <span className="mr-2 font-semibold text-red-700">{key}:</span>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-[1.35rem] border border-zinc-200 bg-white p-4 text-xs text-slate-700">
      {oldData ? JSON.stringify(oldData, null, 2) : null}
      {newData ? JSON.stringify(newData, null, 2) : null}
    </pre>
  );
}

export default function AuditLogClient() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryString = useMemo(
    () =>
      buildAuditLogsQueryString({
        page,
        startDate,
        endDate,
        selectedAction,
        selectedTable,
        userSearch,
      }),
    [page, startDate, endDate, selectedAction, selectedTable, userSearch],
  );

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    dataUpdatedAt,
  } = useQuery<{ data: AuditLogEntry[]; pagination: Pagination }>({
    queryKey: getAuditLogsQueryKey(queryString),
    queryFn: async () => {
      const response = await fetch(`/api/admin/audit-logs?${queryString}`, {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/login");
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error("Failed to load audit logs.");
      }

      return response.json() as Promise<{ data: AuditLogEntry[]; pagination: Pagination }>;
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: AUDIT_LOG_PAGE_SIZE,
    total: 0,
    total_pages: 1,
  };
  const error = queryError?.message ?? null;

  const dataAsOf = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const activeFilterCount = countFilters([
    startDate,
    endDate,
    selectedAction,
    selectedTable,
    userSearch,
  ]);
  const hasFilters = activeFilterCount > 0;

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setSelectedAction("");
    setSelectedTable("");
    setUserSearch("");
    setPage(1);
  }

  function handleCsvExport() {
    const params = new URLSearchParams();
    if (startDate) {
      params.set("start_date", startDate);
    }
    if (endDate) {
      params.set("end_date", endDate);
    }
    if (selectedAction) {
      params.set("action", selectedAction);
    }
    if (selectedTable) {
      params.set("table_name", selectedTable);
    }
    if (userSearch.trim()) {
      params.set("performed_by_name", userSearch.trim());
    }

    params.set("format", "csv");
    const anchor = document.createElement("a");
    anchor.href = `/api/admin/audit-logs?${params.toString()}`;
    anchor.click();
  }

  function toggleRow(id: string) {
    setExpandedId((previous) => (previous === id ? null : id));
  }

  return (
    <div className="w-full space-y-6">
      <WorkspacePanel className="overflow-hidden">
        <div className="relative px-6 py-7 md:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(59,130,246,0.08),rgba(59,130,246,0.45),rgba(59,130,246,0.08))]" />
          <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.35),transparent_70%)] blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Compliance and traceability
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-4xl leading-tight text-slate-950 [font-family:var(--font-playfair)]">
                    Audit trail overview
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
                    Review every important action, narrow down by workflow, and
                    inspect the before-and-after record changes without leaving
                    this workspace.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {dataAsOf ? (
                <span className="inline-flex rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600">
                  Snapshot: {dataAsOf}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleCsvExport}
                className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </WorkspacePanel>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Visible Entries"
          value={String(logs.length)}
          helper={`Showing up to ${pagination.limit} records on this page.`}
        />
        <SummaryCard
          label="Active Filters"
          value={String(activeFilterCount)}
          helper={
            hasFilters
              ? "Date, action, table, and actor filters are currently narrowing the feed."
              : "No filters applied. You are seeing the broadest recent activity."
          }
        />
        <SummaryCard
          label="Dataset Size"
          value={String(pagination.total)}
          helper={`Page ${pagination.page} of ${pagination.total_pages} in the current result set.`}
        />
      </div>

      <WorkspaceFilterBar>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_240px_minmax(0,1.2fr)_auto]">
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setPage(1);
            }}
            aria-label="Start date"
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setPage(1);
            }}
            aria-label="End date"
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
          />
          <div className="min-w-0">
            <Select
              value={selectedAction}
              onChange={(value) => {
                setSelectedAction(value);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
              aria-label="Filter by action"
            />
          </div>
          <div className="min-w-0">
            <Select
              value={selectedTable}
              onChange={(value) => {
                setSelectedTable(value);
                setPage(1);
              }}
              options={TABLE_OPTIONS}
              aria-label="Filter by table"
            />
          </div>
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(event) => {
                setUserSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search actor"
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FilterX className="h-4 w-4" />
            Clear
          </button>
        </div>
      </WorkspaceFilterBar>

      {error ? <InlineErrorBanner message={error} /> : null}

      {isLoading && !data ? (
        <WorkspacePanel className="px-6 py-20">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Loading audit history
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Pulling the latest compliance trail from the server.
              </p>
            </div>
          </div>
        </WorkspacePanel>
      ) : logs.length === 0 ? (
        <WorkspaceEmptyState
          icon={ClipboardList}
          eyebrow="Audit logs"
          title="No matching activity found"
          description="Try widening the date range or clearing filters to see more recorded activity."
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50"
              >
                Reset filters
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const hasDetail = Boolean(log.old_data ?? log.new_data);
            const badgeClass =
              ACTION_BADGE[log.action] ?? "border-zinc-200 bg-zinc-50 text-zinc-600";
            const actorLabel =
              log.profiles?.full_name ?? log.profiles?.email ?? "System";

            return (
              <WorkspacePanel key={log.id} className="overflow-hidden">
                <div className="px-5 py-5 md:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${badgeClass}`}
                        >
                          {log.action}
                        </span>
                        <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {formatTableName(log.table_name)}
                        </span>
                        {log.ip_address ? (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-slate-500">
                            IP {log.ip_address}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)_minmax(180px,0.9fr)]">
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Actor
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">
                            {actorLabel}
                          </p>
                          {log.profiles?.email && actorLabel !== log.profiles.email ? (
                            <p className="mt-1 text-sm text-slate-500">
                              {log.profiles.email}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Timestamp
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {formatTimestamp(log.performed_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Record ID
                          </p>
                          <p
                            className="mt-2 font-mono text-sm text-slate-700"
                            title={log.record_id ?? ""}
                          >
                            {formatRecordId(log.record_id)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-start">
                      {hasDetail ? (
                        <button
                          type="button"
                          onClick={() => toggleRow(log.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {isExpanded ? "Hide changes" : "View changes"}
                        </button>
                      ) : (
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-slate-500">
                          No field diff
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && hasDetail ? (
                    <Fragment>
                      <div className="my-5 h-px bg-zinc-200" />
                      <div className="space-y-4">
                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Record changes
                          </p>
                          <div className="mt-3">
                            <DiffView
                              action={log.action}
                              oldData={log.old_data}
                              newData={log.new_data}
                            />
                          </div>
                        </div>
                        {log.user_agent ? (
                          <div>
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                              User agent
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              {log.user_agent}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </Fragment>
                  ) : null}
                </div>
              </WorkspacePanel>
            );
          })}
        </div>
      )}

      {pagination.total_pages > 1 ? (
        <WorkspacePanel className="px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Page <span className="font-semibold text-slate-900">{pagination.page}</span>{" "}
              of <span className="font-semibold text-slate-900">{pagination.total_pages}</span>
              {" "}with {pagination.total} total entries.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.total_pages || isFetching}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </WorkspacePanel>
      ) : null}
    </div>
  );
}
