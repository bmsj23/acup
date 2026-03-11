"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ClipboardList, Download, Loader2 } from "lucide-react";
import Select from "@/components/ui/select";
import InlineErrorBanner from "@/components/ui/inline-error-banner";

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
  INSERT: "bg-green-100 text-green-700",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  VIEW: "bg-zinc-100 text-zinc-600",
  DOWNLOAD: "bg-blue-100 text-blue-700",
  LOGIN: "bg-indigo-100 text-indigo-700",
  LOGOUT: "bg-zinc-100 text-zinc-600",
  ACCESS_DENIED: "bg-red-100 text-red-700",
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
      return <p className="text-xs italic text-zinc-400">No field changes detected.</p>;
    }
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 font-mono text-xs">
        {changedKeys.map((key) => (
          <div key={key} className="border-b border-zinc-100 last:border-0">
            <div className="bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {key}
            </div>
            {oldMap.has(key) && (
              <div className="flex items-start gap-2 bg-red-50 px-3 py-2 text-red-800">
                <span className="select-none font-bold text-red-500 shrink-0">-</span>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(oldMap.get(key), null, 2)}</pre>
              </div>
            )}
            {newMap.has(key) && (
              <div className="flex items-start gap-2 bg-green-50 px-3 py-2 text-green-800">
                <span className="select-none font-bold text-green-500 shrink-0">+</span>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(newMap.get(key), null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (action === "INSERT" && newData) {
    return (
      <div className="overflow-hidden rounded-lg border border-green-200 font-mono text-xs">
        {Object.entries(newData).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 border-b border-green-100 bg-green-50 px-3 py-2 text-green-800 last:border-0">
            <span className="select-none font-bold text-green-500 shrink-0">+</span>
            <span className="mr-2 font-semibold text-green-700">{key}:</span>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
          </div>
        ))}
      </div>
    );
  }
  if (action === "DELETE" && oldData) {
    return (
      <div className="overflow-hidden rounded-lg border border-red-200 font-mono text-xs">
        {Object.entries(oldData).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-3 py-2 text-red-800 last:border-0">
            <span className="select-none font-bold text-red-500 shrink-0">-</span>
            <span className="mr-2 font-semibold text-red-700">{key}:</span>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
          </div>
        ))}
      </div>
    );
  }
  // fallback: raw JSON for other action types that carry data
  return (
    <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-700">
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
    <div className="w-full space-y-6">
      {/* page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-blue-800" />
            <h1 className="font-serif text-2xl font-semibold text-zinc-900">Audit Logs</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Full history of all data changes and user actions in the system.
            {dataAsOf && (
              <span className="ml-2 text-xs text-zinc-400">Data as of {dataAsOf}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCsvExport}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          aria-label="Start date"
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          aria-label="End date"
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
        />
        <Select
          value={selectedAction}
          onChange={(val) => { setSelectedAction(val); setPage(1); }}
          options={ACTION_OPTIONS}
          aria-label="Filter by action"
        />
        <Select
          value={selectedTable}
          onChange={(val) => { setSelectedTable(val); setPage(1); }}
          options={TABLE_OPTIONS}
          aria-label="Filter by table"
        />
        <input
          type="text"
          value={userSearch}
          onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
          placeholder="Search by user..."
          className="h-10 w-48 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-zinc-500 hover:text-zinc-700 hover:cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <InlineErrorBanner message={error} />}

      {/* table */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-600">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <ClipboardList className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm text-zinc-600">No audit log entries found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Date / Time</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">User</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Action</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Record ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const profile = log.profiles;
                const userName = profile?.email ?? "—";
                const badgeClass = ACTION_BADGE[log.action] ?? "bg-zinc-100 text-zinc-600";
                const hasDetail = log.old_data ?? log.new_data;

                return (
                  <Fragment key={log.id}>
                    <tr
                      className={`transition-colors ${isExpanded ? "bg-zinc-50" : "hover:bg-zinc-50/60"}`}
                    >
                      <td className="px-4 py-3">
                        {hasDetail ? (
                          <button
                            type="button"
                            onClick={() => toggleRow(log.id)}
                            className="text-zinc-400 transition-colors hover:text-zinc-600 hover:cursor-pointer"
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                        {formatTimestamp(log.performed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-800">{userName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        <span title={log.record_id ?? ""}>
                          {log.record_id ? `${log.record_id.slice(0, 8)}…` : "—"}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && hasDetail && (
                      <tr key={`${log.id}-detail`} className="bg-zinc-50">
                        <td colSpan={5} className="px-6 pb-4 pt-1">
                          <div className="space-y-3">
                            <DiffView action={log.action} oldData={log.old_data} newData={log.new_data} />
                            {log.user_agent && (
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">User Agent</p>
                                <p className="text-xs text-zinc-600">{log.user_agent}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {pagination.total} {pagination.total === 1 ? "entry" : "entries"} •{" "}
            Page {pagination.page} of {pagination.total_pages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:cursor-pointer disabled:opacity-40 disabled:hover:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:cursor-pointer disabled:opacity-40 disabled:hover:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}