"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import Select from "@/components/ui/select";
import MonthPicker from "@/components/ui/month-picker";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import type { EditValues, MetricEntry, Pagination } from "./types";
import MetricsTableRow from "./metrics-table-row";

type MetricsHistoryClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  availableDepartments: { id: string; name: string; code: string }[];
};

export default function MetricsHistoryClient({
  role,
  defaultDepartmentId,
  availableDepartments,
}: MetricsHistoryClientProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? "");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    revenue_total: "", census_total: "", census_opd: "", census_er: "",
    census_inpatient: "", equipment_utilization_pct: "", medication_error_count: "",
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    params.set("start_date", startDate);
    params.set("end_date", endDate);
    return params.toString();
  }, [page, limit, selectedMonth, selectedDepartmentId]);

  const {
    data: metricsData,
    isLoading: loading,
    error: queryError,
  } = useQuery<{ data: MetricEntry[]; pagination: Pagination }>({
    queryKey: ["metrics", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/metrics?${queryString}`, { method: "GET", credentials: "include" });
      if (!response.ok) throw new Error("Failed to load metrics history.");
      return response.json();
    },
    staleTime: 30_000,
  });

  const metrics = metricsData?.data ?? [];
  const pagination: Pagination = metricsData?.pagination ?? { page: 1, limit: 20, total: 0, total_pages: 1 };
  const error = queryError?.message ?? null;

  const editMutation = useMutation({
    mutationFn: async (id: string) => {
      const body: Record<string, unknown> = {
        revenue_total: Number(editValues.revenue_total) || 0,
        census_total: Number(editValues.census_total) || 0,
        census_opd: Number(editValues.census_opd) || 0,
        census_er: Number(editValues.census_er) || 0,
        census_inpatient: Number(editValues.census_inpatient) || 0,
        equipment_utilization_pct: Number(editValues.equipment_utilization_pct) || 0,
      };
      if (editValues.medication_error_count) body.medication_error_count = Number(editValues.medication_error_count) || 0;
      const response = await fetch(`/api/metrics/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error((data as { error?: string } | null)?.error ?? "Failed to update metric.");
      }
    },
    onMutate: () => { setEditBusy(true); setEditError(null); },
    onSuccess: () => {
      toast.success("Metric updated.");
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (err) => { setEditError(err.message); toast.error(err.message); },
    onSettled: () => { setEditBusy(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/metrics/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Failed to delete metric entry.");
    },
    onSuccess: () => {
      toast.success("Metric deleted.");
      void queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (err) => { toast.error(err.message); },
  });

  function startEditing(entry: MetricEntry) {
    setEditingId(entry.id);
    setEditError(null);
    setEditValues({
      revenue_total: String(entry.revenue_total),
      census_total: String(entry.census_total),
      census_opd: String(entry.census_opd),
      census_er: String(entry.census_er),
      census_inpatient: String(entry.census_inpatient),
      equipment_utilization_pct: String(entry.equipment_utilization_pct),
      medication_error_count: String(entry.medication_error_count ?? 0),
    });
  }

  function handleEditValueChange(field: keyof EditValues, value: string) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSaveEdit(id: string) {
    editMutation.mutate(id);
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this metric entry? This action cannot be undone.");
    if (!confirmed) return;
    deleteMutation.mutate(id);
  }

  const isLeadership = role === "avp" || role === "division_head";

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:cursor-pointer hover:text-zinc-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Metrics History</h1>
          <p className="mt-1 text-sm text-zinc-500">View, edit, and manage submitted metric entries.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        {isLeadership && (
          <Select
            value={selectedDepartmentId}
            onChange={(val) => { setSelectedDepartmentId(val); setPage(1); }}
            options={[{ value: "", label: "All Departments" }, ...availableDepartments.map((d) => ({ value: d.id, label: d.name }))]}
          />
        )}
      </div>

      {error && (
        <InlineErrorBanner message={error} />
      )}

      {loading ? (
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
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Department</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Revenue</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Census</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Equip %</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {metrics.map((entry) => (
                <MetricsTableRow
                  key={entry.id}
                  entry={entry}
                  isEditing={editingId === entry.id}
                  editValues={editValues}
                  editBusy={editBusy}
                  editError={editError}
                  deletingId={deleteMutation.variables ?? null}
                  onStartEdit={startEditing}
                  onCancelEdit={() => { setEditingId(null); setEditError(null); }}
                  onSaveEdit={(id) => handleSaveEdit(id)}
                  onDelete={(id) => handleDelete(id)}
                  onEditValueChange={handleEditValueChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
          <p className="text-xs text-zinc-500">
            Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button" disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button" disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
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