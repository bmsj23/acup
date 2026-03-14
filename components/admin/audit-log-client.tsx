"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Search,
} from "lucide-react";
import Select from "@/components/ui/select";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import DatePicker from "@/components/ui/date-picker";

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
  { value: "departments", label: "departments" },
  { value: "incident_reports", label: "incident_reports" },
  { value: "message_messages", label: "message_messages" },
  { value: "message_threads", label: "message_threads" },
  { value: "profiles", label: "profiles" },
];

const ACTION_BADGE: Record<string, string> = {
  INSERT: "bg-emerald-600 text-white",
  UPDATE: "bg-emerald-50 text-emerald-700",
  DELETE: "bg-slate-900 text-white",
  VIEW: "bg-slate-100 text-slate-700",
  DOWNLOAD: "bg-blue-50 text-blue-700",
  LOGIN: "bg-blue-100 text-blue-800",
  LOGOUT: "bg-slate-100 text-slate-700",
  ACCESS_DENIED: "bg-slate-800 text-white",
};

const PAGE_SIZE = 25;

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

function formatTableLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function displayRecordId(value: string | null) {
  if (!value) return "-";
  if (value.length <= 24) return value;
  return `${value.slice(0, 18)}...${value.slice(-8)}`;
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
      return <p className="text-xs italic text-slate-400">No field changes detected.</p>;
    }

    return (
      <div className="overflow-hidden rounded-[1.1rem] border border-blue-100/80 bg-white">
        {changedKeys.map((key) => (
          <div key={key} className="border-b border-blue-50 last:border-0">
            <div className="bg-blue-50/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">
              {key}
            </div>
            {oldMap.has(key) ? (
              <div className="flex items-start gap-3 border-b border-red-100 bg-red-50/65 px-4 py-3 last:border-b-0">
                <span className="shrink-0 font-bold text-red-600">Before</span>
                <pre className="whitespace-pre-wrap break-all text-xs text-red-900/85">
                  {JSON.stringify(oldMap.get(key), null, 2)}
                </pre>
              </div>
            ) : null}
            {newMap.has(key) ? (
              <div className="flex items-start gap-3 bg-emerald-50/60 px-4 py-3">
                <span className="shrink-0 font-bold text-emerald-700">After</span>
                <pre className="whitespace-pre-wrap break-all text-xs text-emerald-950/85">
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
      <div className="overflow-hidden rounded-[1.1rem] border border-blue-100/80 bg-white">
        {Object.entries(newData).map(([key, value]) => (
          <div key={key} className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50/45 px-4 py-3 last:border-0">
            <span className="shrink-0 font-semibold text-emerald-700">{key}</span>
            <pre className="whitespace-pre-wrap break-all text-xs text-emerald-950/85">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  if (action === "DELETE" && oldData) {
    return (
      <div className="overflow-hidden rounded-[1.1rem] border border-blue-100/80 bg-white">
        {Object.entries(oldData).map(([key, value]) => (
          <div key={key} className="flex items-start gap-3 border-b border-red-100 bg-red-50/55 px-4 py-3 last:border-0">
            <span className="shrink-0 font-semibold text-red-700">{key}</span>
            <pre className="whitespace-pre-wrap break-all text-xs text-red-900/85">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-[1.1rem] border border-blue-100/80 bg-white p-4 text-xs text-slate-700">
      {oldData && JSON.stringify(oldData, null, 2)}
      {newData && JSON.stringify(newData, null, 2)}
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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (selectedAction) params.set("action", selectedAction);
    if (selectedTable) params.set("table_name", selectedTable);
    if (userSearch.trim()) params.set("performed_by_name", userSearch.trim());
    return params.toString();
  }, [page, startDate, endDate, selectedAction, selectedTable, userSearch]);

  const {
    data,
    isLoading,
    error: queryError,
    dataUpdatedAt,
  } = useQuery<{ data: AuditLogEntry[]; pagination: Pagination }>({
    queryKey: ["audit-logs", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/admin/audit-logs?${queryString}`, {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/login");
        throw new Error("Unauthorized");
      }

      if (!response.ok) throw new Error("Failed to load audit logs.");
      return response.json() as Promise<{ data: AuditLogEntry[]; pagination: Pagination }>;
    },
    staleTime: 30_000,
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, total_pages: 1 };
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

  const hasFilters = startDate || endDate || selectedAction || selectedTable || userSearch;

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
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (selectedAction) params.set("action", selectedAction);
    if (selectedTable) params.set("table_name", selectedTable);
    if (userSearch.trim()) params.set("performed_by_name", userSearch.trim());
    params.set("format", "csv");

    const a = document.createElement("a");
    a.href = `/api/admin/audit-logs?${params.toString()}`;
    a.click();
  }

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[22rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(245,249,255,0.78),rgba(255,255,255,0))]" />

      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
        <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.2fr)_22rem] xl:items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-blue-700">
                  Governance console
                </p>
                <h1 className="text-3xl font-semibold text-slate-950 [font-family:var(--font-playfair)] md:text-[2.65rem]">
                  Audit logs
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">
              Review system activity, operational access, and data changes in a cleaner forensic workspace tuned for administrative oversight.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-blue-100/80 bg-white/90 p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Visible entries
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{pagination.total}</p>
                <p className="mt-1 text-sm text-slate-600">Across the current filter set.</p>
              </div>
              <div className="rounded-[1.35rem] border border-blue-100/80 bg-white/90 p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Page size
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{PAGE_SIZE}</p>
                <p className="mt-1 text-sm text-slate-600">Records loaded per request.</p>
              </div>
              <div className="rounded-[1.35rem] border border-blue-100/80 bg-white/90 p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Data as of
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {dataAsOf ?? "--"}
                </p>
                <p className="mt-1 text-sm text-slate-600">Latest successful refresh.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-40px_rgba(30,64,175,0.16)]">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                Audit export
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                Extract a review file
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Export the currently filtered audit set for compliance review, incident follow-up, or internal reporting.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCsvExport}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-800 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_22px_40px_-28px_rgba(30,64,175,0.42)] transition-colors hover:cursor-pointer hover:bg-blue-900"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <div className="mt-5 rounded-[1.35rem] border border-blue-100/80 bg-blue-50/60 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                Review posture
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Use filters first, then export. This keeps administrative reviews focused and avoids noisy bulk extracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
        <div className="grid gap-3 xl:grid-cols-[14rem_14rem_10rem_12rem_minmax(13rem,0.8fr)_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Start date
            </label>
            <DatePicker
              value={startDate}
              onChange={(value) => {
                setStartDate(value);
                setPage(1);
              }}
              placeholder="Select start date"
              className="shadow-[0_10px_24px_-20px_rgba(30,64,175,0.18)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              End date
            </label>
            <DatePicker
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                setPage(1);
              }}
              placeholder="Select end date"
              className="shadow-[0_10px_24px_-20px_rgba(30,64,175,0.18)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Action
            </label>
            <Select
              value={selectedAction}
              onChange={(val) => {
                setSelectedAction(val);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
              aria-label="Filter by action"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Table
            </label>
            <Select
              value={selectedTable}
              onChange={(val) => {
                setSelectedTable(val);
                setPage(1);
              }}
              options={TABLE_OPTIONS}
              aria-label="Filter by table"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Performed by
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email"
                className="h-11 w-full rounded-[1.1rem] border border-blue-100 bg-white px-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex justify-end xl:pb-0.5">
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {error ? <InlineErrorBanner message={error} /> : null}

      {isLoading ? (
        <div className="rounded-[1.9rem] border border-blue-100/75 bg-white/98 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
          <div className="animate-pulse space-y-4">
            <div className="grid gap-3 md:grid-cols-[3rem_13rem_15rem_9rem_14rem_1fr]">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-4 rounded-full bg-blue-100/80" />
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-[1.45rem] border border-blue-50 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.96))] px-4 py-5 md:grid-cols-[3rem_13rem_15rem_9rem_14rem_1fr]"
              >
                <div className="h-5 w-5 rounded-full bg-blue-100/80" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded-full bg-blue-100/80" />
                  <div className="h-3 w-24 rounded-full bg-slate-100" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded-full bg-blue-100/80" />
                  <div className="h-3 w-28 rounded-full bg-slate-100" />
                </div>
                <div className="h-7 w-24 rounded-full bg-blue-100/80" />
                <div className="h-7 w-36 rounded-full bg-blue-50" />
                <div className="h-11 rounded-[1rem] bg-slate-100/90" />
              </div>
            ))}
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-blue-100/75 bg-white/95 py-24 text-center shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
          <ClipboardList className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            No matching audit entries
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            The current audit view is empty
          </h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
            Adjust the review filters or export a broader range if you need more historical activity.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-[1.9rem] border border-blue-100/75 bg-white/98 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[96rem] table-fixed text-left text-sm">
              <colgroup>
                <col style={{ width: "3rem" }} />
                <col style={{ width: "13rem" }} />
                <col style={{ width: "15rem" }} />
                <col style={{ width: "9rem" }} />
                <col style={{ width: "14rem" }} />
                <col style={{ width: "22rem" }} />
              </colgroup>
              <thead className="border-b border-blue-100 bg-blue-50/70">
                <tr>
                  <th className="px-4 py-4" />
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Date / Time
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    User
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Action
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Table
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Record ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const profile = log.profiles;
                  const displayName = profile?.full_name ?? "System User";
                  const displayEmail = profile?.email ?? "No email";
                  const badgeClass = ACTION_BADGE[log.action] ?? "bg-slate-100 text-slate-700";
                  const hasDetail = Boolean(log.old_data ?? log.new_data ?? log.user_agent ?? log.ip_address);

                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={hasDetail ? () => toggleRow(log.id) : undefined}
                        onKeyDown={
                          hasDetail
                            ? (event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  toggleRow(log.id);
                                }
                              }
                            : undefined
                        }
                        role={hasDetail ? "button" : undefined}
                        tabIndex={hasDetail ? 0 : undefined}
                        aria-expanded={hasDetail ? isExpanded : undefined}
                        className={`transition-colors ${
                          isExpanded ? "bg-blue-50/35" : "hover:bg-blue-50/30"
                        } ${hasDetail ? "cursor-pointer" : ""}`}
                      >
                        <td className="px-4 py-4 align-top">
                          {hasDetail ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleRow(log.id);
                              }}
                              className="mt-1 text-slate-400 transition-colors hover:cursor-pointer hover:text-slate-700"
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 align-top text-slate-700">
                          <div className="leading-6">{formatTimestamp(log.performed_at)}</div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{displayName}</p>
                            <p className="truncate text-xs text-slate-500">{displayEmail}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClass}`}>
                            {log.action}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="rounded-full border border-blue-100 bg-blue-50/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                            {formatTableLabel(log.table_name)}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div
                            title={log.record_id ?? ""}
                            className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-3 py-2 font-mono text-xs leading-6 text-slate-700"
                          >
                            {displayRecordId(log.record_id)}
                          </div>
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="bg-blue-50/35">
                          <td colSpan={6} className="px-6 pb-5 pt-1">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                              <div className="rounded-[1.35rem] border border-blue-100/80 bg-white/95 p-4">
                                <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                  Change detail
                                </p>
                                <DiffView action={log.action} oldData={log.old_data} newData={log.new_data} />
                              </div>

                              <div className="space-y-4">
                                <div className="rounded-[1.35rem] border border-blue-100/80 bg-white/95 p-4">
                                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                    Record context
                                  </p>
                                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Audit ID</p>
                                      <p className="mt-1 break-all font-mono text-xs text-slate-700">{log.id}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Table</p>
                                      <p className="mt-1 text-slate-800">{formatTableLabel(log.table_name)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">IP Address</p>
                                      <p className="mt-1 break-all text-slate-800">{log.ip_address ?? "-"}</p>
                                    </div>
                                  </div>
                                </div>

                                {log.user_agent ? (
                                  <div className="rounded-[1.35rem] border border-blue-100/80 bg-white/95 p-4">
                                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                      User agent
                                    </p>
                                    <p className="mt-3 break-all text-xs leading-6 text-slate-600">
                                      {log.user_agent}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pagination.total_pages > 1 ? (
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))] px-5 py-4 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.14)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {pagination.total} {pagination.total === 1 ? "entry" : "entries"} on{" "}
            <span className="font-semibold text-slate-900">page {pagination.page}</span> of{" "}
            <span className="font-semibold text-slate-900">{pagination.total_pages}</span>.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
