"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock3,
  Hourglass,
  Loader2,
  Plus,
  Save,
  ScanSearch,
  TimerReset,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import StatCard from "@/components/dashboard/stat-card";
import { formatMonthLabel } from "@/components/dashboard/utils";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import Modal from "@/components/ui/modal";
import MonthPicker from "@/components/ui/month-picker";
import Select from "@/components/ui/select";
import WorkspaceEmptyState from "@/components/workspace/workspace-empty-state";
import WorkspacePanel from "@/components/workspace/workspace-panel";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";
import type { TurnaroundTimeEntryItem } from "@/types/monitoring";
import {
  buildTurnaroundTimeListQueryString,
  buildTurnaroundTimeSummaryQueryString,
  fetchTurnaroundTimeList,
  fetchTurnaroundTimeSummary,
  getTurnaroundTimeListQueryKey,
  getTurnaroundTimeSummaryQueryKey,
} from "./queries";
import type {
  TurnaroundTimeClientProps,
  TurnaroundTimeFormState,
  TurnaroundTimeListResponse,
} from "./types";

type SubdepartmentItem = {
  id: string;
  name: string;
};

const inputClassName =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function createEmptyForm(defaultDepartmentId: string) {
  const now = new Date();
  const startedAt = new Date(now.getTime() - 30 * 60_000);

  return {
    department_id: defaultDepartmentId,
    subdepartment_id: "",
    service_name: "",
    case_reference: "",
    started_at: toLocalDateTimeInput(startedAt.toISOString()),
    completed_at: toLocalDateTimeInput(now.toISOString()),
    notes: "",
  } satisfies TurnaroundTimeFormState;
}

export default function TurnaroundTimeClient({
  role,
  defaultDepartmentId,
  availableDepartments,
}: TurnaroundTimeClientProps) {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? "");
  const [selectedSubdepartmentId, setSelectedSubdepartmentId] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const deferredServiceFilter = useDeferredValue(serviceFilter.trim());
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TurnaroundTimeEntryItem | null>(null);
  const [subdepartments, setSubdepartments] = useState<SubdepartmentItem[]>([]);
  const [subdepartmentError, setSubdepartmentError] = useState<string | null>(null);
  const [formState, setFormState] = useState<TurnaroundTimeFormState>(() =>
    createEmptyForm(defaultDepartmentId ?? availableDepartments[0]?.id ?? ""),
  );

  const effectiveDepartmentId =
    role === "department_head" ? defaultDepartmentId ?? "" : selectedDepartmentId;
  const subdepartmentSourceDepartmentId =
    isModalOpen && role !== "department_head"
      ? formState.department_id || effectiveDepartmentId
      : effectiveDepartmentId;
  const summaryQueryString = useMemo(
    () =>
      buildTurnaroundTimeSummaryQueryString({
        selectedMonth,
        selectedDepartmentId: effectiveDepartmentId,
        selectedSubdepartmentId,
        serviceFilter: deferredServiceFilter,
      }),
    [deferredServiceFilter, effectiveDepartmentId, selectedMonth, selectedSubdepartmentId],
  );
  const listQueryString = useMemo(
    () =>
      buildTurnaroundTimeListQueryString({
        page,
        limit,
        selectedMonth,
        selectedDepartmentId: effectiveDepartmentId,
        selectedSubdepartmentId,
        serviceFilter: deferredServiceFilter,
      }),
    [deferredServiceFilter, effectiveDepartmentId, limit, page, selectedMonth, selectedSubdepartmentId],
  );

  useEffect(() => {
    if (!subdepartmentSourceDepartmentId) {
      setSubdepartments([]);
      setSelectedSubdepartmentId("");
      return;
    }

    async function loadSubdepartments() {
      setSubdepartmentError(null);
      try {
        const response = await fetch(
          `/api/subdepartments?department_id=${subdepartmentSourceDepartmentId}&limit=200`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        if (!response.ok) {
          setSubdepartments([]);
          setSubdepartmentError("Failed to load subdepartments.");
          return;
        }

        const payload = (await response.json()) as { data?: SubdepartmentItem[] };
        setSubdepartments(payload.data ?? []);
      } catch {
        setSubdepartments([]);
        setSubdepartmentError("Failed to load subdepartments.");
      }
    }

    void loadSubdepartments();
  }, [subdepartmentSourceDepartmentId]);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: getTurnaroundTimeSummaryQueryKey(summaryQueryString),
    queryFn: async () => fetchTurnaroundTimeSummary(summaryQueryString),
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const {
    data: listResponse,
    isLoading: listLoading,
    isFetching: listFetching,
    error: listError,
  } = useQuery<TurnaroundTimeListResponse>({
    queryKey: getTurnaroundTimeListQueryKey(listQueryString),
    queryFn: async () => fetchTurnaroundTimeList(listQueryString),
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const entries = listResponse?.data ?? [];
  const pagination =
    listResponse?.pagination ?? { page: 1, limit: 20, total: 0, total_pages: 1 };
  const activeDepartmentName =
    availableDepartments.find((department) => department.id === effectiveDepartmentId)?.name
    ?? "All supported departments";

  function resetForm(nextDepartmentId = effectiveDepartmentId || availableDepartments[0]?.id || "") {
    setEditingEntry(null);
    setFormState(createEmptyForm(nextDepartmentId));
  }

  function openCreateModal() {
    resetForm(effectiveDepartmentId || availableDepartments[0]?.id || "");
    setIsModalOpen(true);
  }

  function openEditModal(entry: TurnaroundTimeEntryItem) {
    setEditingEntry(entry);
    setFormState({
      department_id: entry.department_id,
      subdepartment_id: entry.subdepartment_id ?? "",
      service_name: entry.service_name,
      case_reference: entry.case_reference,
      started_at: toLocalDateTimeInput(entry.started_at),
      completed_at: toLocalDateTimeInput(entry.completed_at),
      notes: entry.notes ?? "",
    });
    setIsModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        department_id: role === "department_head" ? defaultDepartmentId : formState.department_id,
        subdepartment_id: formState.subdepartment_id || null,
        service_name: formState.service_name.trim(),
        case_reference: formState.case_reference.trim(),
        started_at: toIsoDateTime(formState.started_at),
        completed_at: toIsoDateTime(formState.completed_at),
        notes: formState.notes.trim() || null,
      };

      const response = await fetch(
        editingEntry ? `/api/turnaround-time/${editingEntry.id}` : "/api/turnaround-time",
        {
          method: editingEntry ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const payloadError = (await response.json().catch(() => null)) as {
          error?: string;
          details?: Record<string, string[]>;
        } | null;
        const firstDetail = payloadError?.details
          ? Object.values(payloadError.details)[0]?.[0]
          : null;
        throw new Error(firstDetail ?? payloadError?.error ?? "Failed to save turnaround time entry.");
      }
    },
    onSuccess: () => {
      toast.success(editingEntry ? "Turnaround time entry updated." : "Turnaround time entry saved.");
      setIsModalOpen(false);
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["turnaround-time"] });
      void queryClient.invalidateQueries({ queryKey: ["turnaround-time-summary"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/turnaround-time/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete turnaround time entry.");
      }
    },
    onSuccess: () => {
      toast.success("Turnaround time entry deleted.");
      void queryClient.invalidateQueries({ queryKey: ["turnaround-time"] });
      void queryClient.invalidateQueries({ queryKey: ["turnaround-time-summary"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.2)]">
        <div className="relative px-6 py-7 md:px-8">
          <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Service turnaround
              </p>
              <h1 className="mt-3 text-[clamp(2.1rem,3.7vw,3.1rem)] font-semibold leading-[0.98] text-slate-950 [font-family:var(--font-playfair)]">
                Track turnaround without patient identifiers
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Capture service start and completion times, compare monthly patterns, and correct
                records from one protected workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <OptimisticRouteLink
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </OptimisticRouteLink>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
              >
                <Plus className="h-4 w-4" />
                Log case time
              </button>
            </div>
          </div>
        </div>
      </section>

      {(summaryError || listError) ? (
        <InlineErrorBanner
          message={
            summaryError?.message
            ?? listError?.message
            ?? "Failed to load turnaround time data."
          }
        />
      ) : null}

      <WorkspacePanel className="p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(15rem,16rem)_minmax(16rem,18rem)_minmax(0,1fr)_minmax(16rem,18rem)]">
          <MonthPicker
            value={selectedMonth}
            onChange={(value) => {
              setSelectedMonth(value);
              setPage(1);
            }}
            className="rounded-2xl border-zinc-100 bg-white"
          />

          {role !== "department_head" ? (
            <Select
              value={selectedDepartmentId}
              onChange={(value) => {
                setSelectedDepartmentId(value);
                setSelectedSubdepartmentId("");
                setPage(1);
              }}
              className="min-w-[18rem] rounded-2xl border-zinc-100 bg-white py-3"
              dropdownMinWidth={288}
              options={[
                { value: "", label: "All supported departments" },
                ...availableDepartments.map((department) => ({
                  value: department.id,
                  label: department.name,
                  })),
              ]}
            />
          ) : (
            <div className="flex items-center rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm font-medium text-zinc-700">
              {activeDepartmentName}
            </div>
          )}

          <label className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3">
            <ScanSearch className="h-4 w-4 text-zinc-400" />
            <input
              value={serviceFilter}
              onChange={(event) => {
                setServiceFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Filter by service name"
              className="w-full border-0 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
            />
          </label>

          {effectiveDepartmentId && subdepartments.length > 0 ? (
            <Select
              value={selectedSubdepartmentId}
              onChange={(value) => {
                setSelectedSubdepartmentId(value);
                setPage(1);
              }}
              options={[
                { value: "", label: "All subdepartments" },
                ...subdepartments.map((subdepartment) => ({
                  value: subdepartment.id,
                  label: subdepartment.name,
                })),
              ]}
              className="min-w-[16rem] rounded-2xl border-zinc-100 bg-white py-3"
              dropdownMinWidth={272}
            />
          ) : (
            <div className="flex items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              {effectiveDepartmentId
                ? "No subdepartment filters available."
                : "Choose a department to filter by subdepartment."}
            </div>
          )}
        </div>

        <p className="mt-3 px-1 text-sm text-zinc-500">
          {subdepartmentError
            ? subdepartmentError
            : `Showing ${formatMonthLabel(selectedMonth)} entries for ${activeDepartmentName}.`}
        </p>
      </WorkspacePanel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Entries"
          value={String(summary?.totals.entry_count ?? 0)}
          icon={Clock3}
          iconColor="text-blue-800 bg-blue-50"
          subValue="Tracked cases this month"
        />
        <StatCard
          title="Average Time"
          value={formatDuration(Math.round(summary?.totals.average_minutes ?? 0))}
          icon={Hourglass}
          iconColor="text-emerald-700 bg-emerald-50"
          subValue="Across filtered entries"
        />
        <StatCard
          title="Median Time"
          value={formatDuration(Math.round(summary?.totals.median_minutes ?? 0))}
          icon={TimerReset}
          iconColor="text-orange-700 bg-orange-50"
          subValue="Midpoint turnaround"
        />
        <StatCard
          title="Longest Case"
          value={formatDuration(Math.round(summary?.totals.longest_minutes ?? 0))}
          icon={ScanSearch}
          iconColor="text-violet-700 bg-violet-50"
          subValue="Longest recorded duration"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <WorkspacePanel className="p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Service snapshot
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            Highest-volume services
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Use this list to see which services dominate the current turnaround workload.
          </p>

          <div className="mt-5 space-y-3">
            {(summaryLoading && !summary) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
              </div>
            ) : summary?.services.length ? (
              summary.services.slice(0, 6).map((service) => (
                <div
                  key={service.service_name}
                  className="rounded-[1.35rem] border border-zinc-100 bg-zinc-50 p-4"
                >
                  <p className="text-sm font-semibold text-slate-950">{service.service_name}</p>
                  <p className="mt-2 text-sm text-slate-600">{service.entry_count} cases</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Avg {formatDuration(Math.round(service.average_minutes))}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                No services recorded for this filter set yet.
              </div>
            )}
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Entry list
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                Recorded turnaround cases
              </h2>
            </div>
            {listFetching && !listLoading ? (
              <span className="text-sm font-medium text-blue-700">Refreshing</span>
            ) : null}
          </div>

          {(listLoading && !listResponse) ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
            </div>
          ) : entries.length === 0 ? (
            <WorkspaceEmptyState
              icon={Clock3}
              eyebrow="No entries"
              title="No turnaround cases found"
              description="Adjust the month or filters, or log a new case to start tracking service timing."
              action={
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
                >
                  <Plus className="h-4 w-4" />
                  Log case time
                </button>
              }
            />
          ) : (
            <div className="mt-5 space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[1.45rem] border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {entry.departments?.name ?? "Department"}
                        {entry.department_subdepartments?.name
                          ? ` / ${entry.department_subdepartments.name}`
                          : ""}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {entry.service_name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">Case ref {entry.case_reference}</p>
                      <p className="mt-3 text-sm text-slate-600">
                        Started {new Date(entry.started_at).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Completed {new Date(entry.completed_at).toLocaleString()}
                      </p>
                      {entry.notes ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">{entry.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-start gap-2 lg:max-w-72 lg:justify-end">
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {formatDuration(entry.duration_minutes ?? 0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(entry)}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            "Delete this turnaround time entry?",
                          );
                          if (confirmed) {
                            deleteMutation.mutate(entry.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.total_pages > 1 ? (
            <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4">
              <p className="text-xs text-zinc-500">
                Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </WorkspacePanel>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingEntry ? "Edit turnaround time entry" : "Log turnaround time"}
      >
        <div className="space-y-4">
          {role !== "department_head" ? (
            <Select
              value={formState.department_id}
              onChange={(value) => {
                setFormState((current) => ({
                  ...current,
                  department_id: value,
                  subdepartment_id: "",
                }));
              }}
              options={availableDepartments.map((department) => ({
                value: department.id,
                label: department.name,
              }))}
            />
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
              {activeDepartmentName}
            </div>
          )}

          {(formState.department_id && subdepartments.length > 0) ? (
            <Select
              value={formState.subdepartment_id}
              onChange={(value) =>
                setFormState((current) => ({ ...current, subdepartment_id: value }))
              }
              options={[
                { value: "", label: "Department total" },
                ...subdepartments.map((subdepartment) => ({
                  value: subdepartment.id,
                  label: subdepartment.name,
                })),
              ]}
            />
          ) : null}

          <input
            value={formState.service_name}
            onChange={(event) =>
              setFormState((current) => ({ ...current, service_name: event.target.value }))
            }
            className={inputClassName}
            placeholder="Service name"
          />

          <input
            value={formState.case_reference}
            onChange={(event) =>
              setFormState((current) => ({ ...current, case_reference: event.target.value }))
            }
            className={inputClassName}
            placeholder="Non-identifying case reference"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              <span>Started at</span>
              <input
                type="datetime-local"
                value={formState.started_at}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, started_at: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-zinc-700">
              <span>Completed at</span>
              <input
                type="datetime-local"
                value={formState.completed_at}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, completed_at: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
          </div>

          <textarea
            rows={4}
            value={formState.notes}
            onChange={(event) =>
              setFormState((current) => ({ ...current, notes: event.target.value }))
            }
            className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            placeholder="Optional operational notes"
          />

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending
                || !(role === "department_head" ? defaultDepartmentId : formState.department_id)
                || !formState.service_name.trim()
                || !formState.case_reference.trim()
                || !formState.started_at
                || !formState.completed_at
              }
              className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingEntry ? "Update entry" : "Save entry"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
