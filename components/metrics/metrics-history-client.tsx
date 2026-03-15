"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Loader2, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TransactionCategoriesSection from "@/components/metrics/transaction-categories-section";
import {
  buildMetricsHistoryQueryString,
  getMetricsHistoryQueryKey,
} from "@/components/metrics/metrics-history-query";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import Modal from "@/components/ui/modal";
import MonthPicker from "@/components/ui/month-picker";
import Select from "@/components/ui/select";
import type { MedicalRecordsTransactionCategory } from "@/lib/constants/departments";
import { METRIC_CATEGORIES, type MetricCategory } from "@/lib/constants/metrics";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";
import type { EditValues, MetricEntry, Pagination } from "./types";
import { formatCurrency } from "./types";

type MetricsHistoryClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  availableDepartments: { id: string; name: string; code: string }[];
};

const inputClassName =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

const emptyEditValues: EditValues = {
  revenue_total: "0",
  self_pay_count: "0",
  hmo_count: "0",
  guarantee_letter_count: "0",
  pharmacy_revenue_inpatient: "",
  pharmacy_revenue_opd: "",
  census_total: "0",
  census_opd: "0",
  census_er: "0",
  census_walk_in: "",
  census_inpatient: "",
  monthly_input_count: "0",
  equipment_utilization_pct: "0",
  medication_error_count: "0",
  notes: "",
  transaction_entries: [],
  category: "operations",
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMetricDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeNullableNumber(value: string) {
  return value === "" ? null : Number(value);
}

export default function MetricsHistoryClient({
  role,
  defaultDepartmentId,
  availableDepartments,
}: MetricsHistoryClientProps) {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? "");
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | "all">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [editingEntry, setEditingEntry] = useState<MetricEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editValues, setEditValues] = useState<EditValues>(emptyEditValues);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const queryString = useMemo(
    () =>
      buildMetricsHistoryQueryString({
        page,
        limit,
        selectedMonth,
        selectedDepartmentId,
        selectedCategory,
      }),
    [limit, page, selectedCategory, selectedDepartmentId, selectedMonth],
  );

  const {
    data: metricsData,
    isLoading,
    error: queryError,
  } = useQuery<{ data: MetricEntry[]; pagination: Pagination }>({
    queryKey: getMetricsHistoryQueryKey(queryString),
    queryFn: async () => {
      const response = await fetch(`/api/metrics?${queryString}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load metrics history.");
      }
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const metrics = metricsData?.data ?? [];
  const pagination =
    metricsData?.pagination ?? { page: 1, limit: 20, total: 0, total_pages: 1 };
  const error = queryError?.message ?? null;
  const isLeadership = role === "avp" || role === "division_head";

  const editMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: MetricCategory }) => {
      const body: Record<string, unknown> = { category };

      if (category === "revenue") {
        body.revenue = {
          revenue_total: Number(editValues.revenue_total || 0),
          self_pay_count: Number(editValues.self_pay_count || 0),
          hmo_count: Number(editValues.hmo_count || 0),
          guarantee_letter_count: Number(editValues.guarantee_letter_count || 0),
          pharmacy_revenue_inpatient: normalizeNullableNumber(editValues.pharmacy_revenue_inpatient),
          pharmacy_revenue_opd: normalizeNullableNumber(editValues.pharmacy_revenue_opd),
        };
      }

      if (category === "census") {
        body.census = {
          census_total: Number(editValues.census_total || 0),
          census_opd: Number(editValues.census_opd || 0),
          census_er: Number(editValues.census_er || 0),
          census_walk_in: normalizeNullableNumber(editValues.census_walk_in),
          census_inpatient: normalizeNullableNumber(editValues.census_inpatient),
        };
      }

      if (category === "operations") {
        body.operations = {
          monthly_input_count: Number(editValues.monthly_input_count || 0),
          equipment_utilization_pct: Number(editValues.equipment_utilization_pct || 0),
          medication_error_count: Number(editValues.medication_error_count || 0),
          notes: editValues.notes.trim() || null,
          transaction_entries: editValues.transaction_entries,
        };
      }

      const response = await fetch(`/api/metrics/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to update metric.");
      }
    },
    onMutate: () => {
      setEditBusy(true);
      setEditError(null);
    },
    onSuccess: () => {
      toast.success("Metric updated.");
      setIsEditModalOpen(false);
      setEditingEntry(null);
      void queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (mutationError) => {
      setEditError(mutationError.message);
      toast.error(mutationError.message);
    },
    onSettled: () => {
      setEditBusy(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/metrics/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete metric entry.");
      }
    },
    onSuccess: () => {
      toast.success("Metric deleted.");
      void queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });

  function handleEditValueChange(field: keyof EditValues, value: string) {
    setEditValues((current) => ({ ...current, [field]: value }));
  }

  function toggleTransactionCategory(category: MedicalRecordsTransactionCategory) {
    setEditValues((current) => {
      const exists = current.transaction_entries.some((entry) => entry.category === category);
      return {
        ...current,
        transaction_entries: exists
          ? current.transaction_entries.filter((entry) => entry.category !== category)
          : [...current.transaction_entries, { category, count: 0 }],
      };
    });
  }

  function updateTransactionCategoryCount(
    category: MedicalRecordsTransactionCategory,
    value: string,
  ) {
    setEditValues((current) => ({
      ...current,
      transaction_entries: current.transaction_entries.map((entry) =>
        entry.category === category
          ? { ...entry, count: Number(value || 0) }
          : entry,
      ),
    }));
  }

  function buildAvailableActions(entry: MetricEntry) {
    if (selectedCategory !== "all") {
      return [selectedCategory];
    }

    const capabilities = getDepartmentCapabilities(entry.departments);
    const actions: MetricCategory[] = ["operations"];

    if (capabilities.supportsRevenue) {
      actions.unshift("revenue");
    }

    if (capabilities.supportsCensus) {
      actions.splice(capabilities.supportsRevenue ? 1 : 0, 0, "census");
    }

    return actions;
  }

  function startEditing(entry: MetricEntry, category: MetricCategory) {
    setEditingEntry(entry);
    setEditError(null);
    setEditValues({
      revenue_total: String(entry.revenue_total),
      self_pay_count: String(entry.self_pay_count),
      hmo_count: String(entry.hmo_count),
      guarantee_letter_count: String(entry.guarantee_letter_count),
      pharmacy_revenue_inpatient:
        entry.pharmacy_revenue_inpatient === null ? "" : String(entry.pharmacy_revenue_inpatient),
      pharmacy_revenue_opd:
        entry.pharmacy_revenue_opd === null ? "" : String(entry.pharmacy_revenue_opd),
      census_total: String(entry.census_total),
      census_opd: String(entry.census_opd),
      census_er: String(entry.census_er),
      census_walk_in: entry.census_walk_in === null ? "" : String(entry.census_walk_in),
      census_inpatient: entry.census_inpatient === null ? "" : String(entry.census_inpatient),
      monthly_input_count: String(entry.monthly_input_count),
      equipment_utilization_pct: String(entry.equipment_utilization_pct),
      medication_error_count: String(entry.medication_error_count ?? 0),
      notes: entry.notes ?? "",
      transaction_entries: entry.transaction_entries ?? [],
      category,
    });
    setIsEditModalOpen(true);
  }

  const editingCapabilities = editingEntry
    ? getDepartmentCapabilities(editingEntry.departments)
    : null;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Metrics correction history</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Filter by category, review saved entries, and correct only the slice that needs attention.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[15rem_14rem_minmax(16rem,1fr)]">
        <MonthPicker
          value={selectedMonth}
          onChange={(value) => {
            setSelectedMonth(value);
            setPage(1);
          }}
          className="min-w-[15rem]"
        />
        <Select
          value={selectedCategory}
          onChange={(value) => {
            setSelectedCategory(value as MetricCategory | "all");
            setPage(1);
          }}
          className="min-w-[14rem]"
          options={[
            { value: "all", label: "All categories" },
            ...METRIC_CATEGORIES.map((category) => ({
              value: category,
              label: category.charAt(0).toUpperCase() + category.slice(1),
            })),
          ]}
        />
        {isLeadership ? (
          <Select
            value={selectedDepartmentId}
            onChange={(value) => {
              setSelectedDepartmentId(value);
              setPage(1);
            }}
            className="min-w-[16rem]"
            dropdownMinWidth={288}
            options={[
              { value: "", label: "All departments" },
              ...availableDepartments.map((department) => ({
                value: department.id,
                label: department.name,
              })),
            ]}
          />
        ) : null}
      </div>

      {error ? <InlineErrorBanner message={error} /> : null}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-600">Loading metrics...</p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <CalendarDays className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm text-zinc-600">No metrics found for this period.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {metrics.map((entry) => {
            const capabilities = getDepartmentCapabilities(entry.departments);
            const categoryActions = buildAvailableActions(entry);

            return (
              <div
                key={entry.id}
                className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.14)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {formatMetricDate(entry.metric_date)}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">
                      {entry.departments?.name ?? "Unknown department"}
                      {entry.department_subdepartments?.name
                        ? ` / ${entry.department_subdepartments.name}`
                        : ""}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Updated {new Date(entry.updated_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categoryActions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => startEditing(entry, category)}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Edit {category}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Delete this metric entry? This action cannot be undone.",
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

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {capabilities.supportsRevenue ? (
                    <div className="rounded-[1.3rem] border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Revenue
                      </p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900">
                        {formatCurrency(entry.revenue_total)}
                      </p>
                      <p className="mt-2 text-xs text-zinc-600">
                        Self-pay {entry.self_pay_count} | HMO {entry.hmo_count} | GL{" "}
                        {entry.guarantee_letter_count}
                      </p>
                    </div>
                  ) : null}

                  {capabilities.supportsCensus ? (
                    <div className="rounded-[1.3rem] border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Census
                      </p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900">
                        {entry.census_total.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-zinc-600">
                        OPD {entry.census_opd} | ER {entry.census_er}
                        {entry.census_walk_in !== null ? ` | Walk-in ${entry.census_walk_in}` : ""}
                        {entry.census_inpatient !== null
                          ? ` | Inpatient ${entry.census_inpatient}`
                          : ""}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[1.3rem] border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      Operations
                    </p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      {entry.monthly_input_count.toLocaleString()} daily count
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {capabilities.supportsEquipment
                        ? `Equipment ${entry.equipment_utilization_pct.toFixed(1)}%`
                        : "Equipment hidden"}
                      {capabilities.tracksMedicationErrors
                        ? ` | Med errors ${entry.medication_error_count ?? 0}`
                        : ""}
                    </p>
                    {entry.transaction_entries.length > 0 ? (
                      <p className="mt-2 text-xs text-zinc-600">
                        {entry.transaction_entries
                          .map((item) => `${item.category}: ${item.count}`)
                          .join(" | ")}
                      </p>
                    ) : null}
                    {entry.notes ? (
                      <p className="mt-2 text-xs text-zinc-600">{entry.notes}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.total_pages > 1 ? (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntry(null);
          setEditError(null);
        }}
        title={editingEntry ? `Edit ${editValues.category} entry` : "Edit metric"}
      >
        {editingEntry ? (
          <div className="space-y-4">
            {editValues.category === "revenue" ? (
              <>
                <input
                  type="number"
                  value={editValues.revenue_total}
                  onChange={(event) => handleEditValueChange("revenue_total", event.target.value)}
                  className={inputClassName}
                  placeholder="Revenue total"
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    type="number"
                    value={editValues.self_pay_count}
                    onChange={(event) => handleEditValueChange("self_pay_count", event.target.value)}
                    className={inputClassName}
                    placeholder="Self-pay"
                  />
                  <input
                    type="number"
                    value={editValues.hmo_count}
                    onChange={(event) => handleEditValueChange("hmo_count", event.target.value)}
                    className={inputClassName}
                    placeholder="HMO"
                  />
                  <input
                    type="number"
                    value={editValues.guarantee_letter_count}
                    onChange={(event) =>
                      handleEditValueChange("guarantee_letter_count", event.target.value)
                    }
                    className={inputClassName}
                    placeholder="GL"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="number"
                    value={editValues.pharmacy_revenue_inpatient}
                    onChange={(event) =>
                      handleEditValueChange("pharmacy_revenue_inpatient", event.target.value)
                    }
                    className={inputClassName}
                    placeholder="Pharmacy inpatient"
                  />
                  <input
                    type="number"
                    value={editValues.pharmacy_revenue_opd}
                    onChange={(event) =>
                      handleEditValueChange("pharmacy_revenue_opd", event.target.value)
                    }
                    className={inputClassName}
                    placeholder="Pharmacy OPD"
                  />
                </div>
              </>
            ) : null}

            {editValues.category === "census" ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    type="number"
                    value={editValues.census_total}
                    onChange={(event) => handleEditValueChange("census_total", event.target.value)}
                    className={inputClassName}
                    placeholder="Total census"
                  />
                  <input
                    type="number"
                    value={editValues.census_opd}
                    onChange={(event) => handleEditValueChange("census_opd", event.target.value)}
                    className={inputClassName}
                    placeholder="OPD"
                  />
                  <input
                    type="number"
                    value={editValues.census_er}
                    onChange={(event) => handleEditValueChange("census_er", event.target.value)}
                    className={inputClassName}
                    placeholder="ER"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="number"
                    value={editValues.census_walk_in}
                    onChange={(event) =>
                      handleEditValueChange("census_walk_in", event.target.value)
                    }
                    className={inputClassName}
                    placeholder="Walk-in"
                  />
                  <input
                    type="number"
                    value={editValues.census_inpatient}
                    onChange={(event) =>
                      handleEditValueChange("census_inpatient", event.target.value)
                    }
                    className={inputClassName}
                    placeholder="Inpatient"
                  />
                </div>
              </>
            ) : null}

            {editValues.category === "operations" ? (
              <>
                <input
                  type="number"
                  value={editValues.monthly_input_count}
                  onChange={(event) =>
                    handleEditValueChange("monthly_input_count", event.target.value)
                  }
                  className={inputClassName}
                  placeholder="Daily operational count"
                />
                {editingCapabilities?.supportsEquipment ? (
                  <input
                    type="number"
                    value={editValues.equipment_utilization_pct}
                    onChange={(event) =>
                      handleEditValueChange("equipment_utilization_pct", event.target.value)
                    }
                    className={inputClassName}
                    placeholder="Equipment utilization"
                  />
                ) : null}
                {editingCapabilities?.tracksMedicationErrors ? (
                  <input
                    type="number"
                    value={editValues.medication_error_count}
                    onChange={(event) =>
                      handleEditValueChange("medication_error_count", event.target.value)
                    }
                    className={inputClassName}
                    placeholder="Medication error count"
                  />
                ) : null}
                {editingCapabilities?.usesTransactionCategories ? (
                  <TransactionCategoriesSection
                    selectedCategories={new Set(editValues.transaction_entries.map((entry) => entry.category))}
                    categoryCounts={new Map(
                      editValues.transaction_entries.map((entry) => [
                        entry.category,
                        String(entry.count),
                      ] as const),
                    )}
                    onToggle={toggleTransactionCategory}
                    onCountChange={updateTransactionCategoryCount}
                  />
                ) : null}
                <textarea
                  rows={4}
                  value={editValues.notes}
                  onChange={(event) => handleEditValueChange("notes", event.target.value)}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Notes"
                />
              </>
            ) : null}

            {editError ? <p className="text-sm font-medium text-red-600">{editError}</p> : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  editMutation.mutate({
                    id: editingEntry.id,
                    category: editValues.category,
                  })
                }
                disabled={editBusy}
                className="rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:opacity-60"
              >
                {editBusy ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEntry(null);
                  setEditError(null);
                }}
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
