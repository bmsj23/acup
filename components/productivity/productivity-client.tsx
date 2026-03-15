"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import MonthPicker from "@/components/ui/month-picker";
import Select from "@/components/ui/select";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import StatCard from "@/components/dashboard/stat-card";
import TrendChart from "@/components/monitoring/trend-chart";
import MonitoringBarChart from "@/components/monitoring/bar-chart";
import { formatInteger, formatMonthLabel } from "@/components/dashboard/utils";
import { APP_BRAND } from "@/lib/constants/brand";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";
import type { MonitoringDepartment, ProductivityRecordItem, ProductivitySummaryResponse } from "@/types/monitoring";
import type { UserRole } from "@/types/database";

type ProductivityClientProps = {
  role: UserRole;
  defaultDepartmentId: string | null;
  availableDepartments: MonitoringDepartment[];
};

type ProductivityFormState = {
  department_id: string;
  procedures_performed: string;
  staff_on_duty_count: string;
  notes: string;
};

const emptyFormState: ProductivityFormState = {
  department_id: "",
  procedures_performed: "0",
  staff_on_duty_count: "1",
  notes: "",
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ProductivityClient({
  role,
  defaultDepartmentId,
  availableDepartments,
}: ProductivityClientProps) {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductivityFormState>({
    ...emptyFormState,
    department_id: defaultDepartmentId ?? availableDepartments[0]?.id ?? "",
  });

  const summaryQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", selectedMonth);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedMonth, selectedDepartmentId]);

  const recordsQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("report_month", `${selectedMonth}-01`);
    params.set("limit", "100");
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedMonth, selectedDepartmentId]);

  const { data: summary, isLoading: summaryLoading, error: summaryError } =
    useQuery<ProductivitySummaryResponse>({
      queryKey: ["productivity-summary", summaryQueryString],
      queryFn: async () => {
        const response = await fetch(`/api/productivity/summary?${summaryQueryString}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to load productivity summary.");
        }
        return response.json();
      },
      staleTime: WORKSPACE_QUERY_STALE_TIME,
      gcTime: WORKSPACE_QUERY_GC_TIME,
      refetchOnWindowFocus: false,
      placeholderData: (previous) => previous,
    });

  const { data: recordsResponse, isLoading: recordsLoading, error: recordsError } = useQuery<{
    data: ProductivityRecordItem[];
  }>({
    queryKey: ["productivity-records", recordsQueryString],
    queryFn: async () => {
      const response = await fetch(`/api/productivity?${recordsQueryString}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load productivity records.");
      }
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const records = recordsResponse?.data ?? [];
  const formDepartmentId = role === "department_head" ? defaultDepartmentId ?? "" : formState.department_id;
  const activeDepartmentName =
    availableDepartments.find((department) => department.id === (selectedDepartmentId || formDepartmentId))
      ?.name ?? "All Departments";

  const resetForm = () => {
    setEditingId(null);
    setFormState({
      ...emptyFormState,
      department_id:
        role === "department_head"
          ? defaultDepartmentId ?? ""
          : selectedDepartmentId || availableDepartments[0]?.id || "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        report_month: `${selectedMonth}-01`,
        department_id: role === "department_head" ? defaultDepartmentId : formState.department_id,
        procedures_performed: Number(formState.procedures_performed || 0),
        staff_on_duty_count: Number(formState.staff_on_duty_count || 0),
        notes: formState.notes.trim() || null,
      };

      const response = await fetch(
        editingId ? `/api/productivity/${editingId}` : "/api/productivity",
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error ?? "Failed to save productivity record.");
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Productivity record updated." : "Productivity record saved.");
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["productivity-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["productivity-records"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/productivity/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete productivity record.");
      }
    },
    onSuccess: () => {
      toast.success("Productivity record deleted.");
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["productivity-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["productivity-records"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const ratioLabel = summary?.totals.productivity_ratio.toFixed(2) ?? "0.00";
  const rankingChartData = (summary?.department_ranking ?? []).slice(0, 6).map((row) => ({
    name: row.department_name,
    value: row.productivity_ratio,
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.2)]">
        <div className="relative px-6 py-7 md:px-8">
          <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Productivity Monitoring
              </p>
              <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                Monthly productivity visibility
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Record monthly procedures / tests and staffing, then let {APP_BRAND.shortName} calculate the
                procedures-per-staff
                consistently for leadership and department operations.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
              {role !== "department_head" && (
                <Select
                  value={selectedDepartmentId}
                  onChange={(value) => {
                    setSelectedDepartmentId(value);
                    setFormState((current) => ({
                      ...current,
                      department_id: value || current.department_id,
                    }));
                  }}
                  className="min-w-[18rem] rounded-2xl border-white/80 bg-white/90 shadow-sm"
                  options={[
                    { value: "", label: "All Departments" },
                    ...availableDepartments.map((department) => ({
                      value: department.id,
                      label: department.name,
                    })),
                  ]}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {(summaryError || recordsError) && (
        <InlineErrorBanner
          message={summaryError?.message ?? recordsError?.message ?? "Failed to load productivity data."}
        />
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Procedures / Tests Performed"
          value={summary ? formatInteger(summary.totals.procedures_performed) : "-"}
          icon={Activity}
          iconColor="text-blue-800 bg-blue-50"
          trend={summary ? `${summary.previous_totals.procedures_performed} last month` : undefined}
          trendUp={
            summary
              ? summary.totals.procedures_performed >= summary.previous_totals.procedures_performed
              : undefined
          }
        />
        <StatCard
          title="Staff On Duty"
          value={summary ? formatInteger(summary.totals.staff_on_duty_count) : "-"}
          icon={Users}
          iconColor="text-emerald-700 bg-emerald-50"
          trend={summary ? `${summary.previous_totals.staff_on_duty_count} last month` : undefined}
          trendUp={
            summary
              ? summary.totals.staff_on_duty_count >= summary.previous_totals.staff_on_duty_count
              : undefined
          }
        />
        <StatCard
          title="Procedures Per Staff"
          value={summary ? ratioLabel : "-"}
          subValue={`${formatMonthLabel(selectedMonth)} | ${activeDepartmentName}`}
          icon={Save}
          iconColor="text-violet-700 bg-violet-50"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TrendChart
          title="Monthly productivity ratio"
          description="The ratio is computed server-side from raw procedures and staff-on-duty counts."
          data={summary?.trend ?? []}
          series={[{ key: "productivity_ratio", label: "Procedures / staff", color: "#1d4ed8" }]}
          valueFormatter={(value) => value.toFixed(2)}
        />
        <MonitoringBarChart
          title="Department ranking"
          description="Leadership can compare departments using the same backend ratio formula."
          data={rankingChartData}
          xKey="name"
          yKey="value"
          color="#0f766e"
          valueFormatter={(value) => value.toFixed(2)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Monthly Entry
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            {editingId ? "Edit monthly record" : "Encode productivity snapshot"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {formatMonthLabel(selectedMonth)} entry for {role === "department_head" ? activeDepartmentName : "the selected department"}.
          </p>

          <div className="mt-5 space-y-4">
            {role !== "department_head" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Department</label>
                <Select
                  value={formState.department_id}
                  onChange={(value) => setFormState((current) => ({ ...current, department_id: value }))}
                  options={availableDepartments.map((department) => ({
                    value: department.id,
                    label: department.name,
                  }))}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Procedures / Tests performed</label>
              <input
                type="number"
                min="0"
                value={formState.procedures_performed}
                onChange={(event) => setFormState((current) => ({
                  ...current,
                  procedures_performed: event.target.value,
                }))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Staff on duty count</label>
              <input
                type="number"
                min="1"
                value={formState.staff_on_duty_count}
                onChange={(event) => setFormState((current) => ({
                  ...current,
                  staff_on_duty_count: event.target.value,
                }))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Notes</label>
              <textarea
                rows={4}
                value={formState.notes}
                onChange={(event) => setFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="Optional context, workload shifts, or staffing notes"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !(formDepartmentId || formState.department_id)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? "Update record" : "Save record"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            History
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            Saved monthly records
          </h2>

          {recordsLoading || summaryLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
              No productivity records found for {formatMonthLabel(selectedMonth)}.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Procedures</th>
                    <th className="px-3 py-3">Staff</th>
                    <th className="px-3 py-3">Ratio</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-3 py-4 font-medium text-zinc-800">
                        {record.departments?.name ?? "Unknown Department"}
                      </td>
                      <td className="px-3 py-4 text-zinc-600">
                        {formatInteger(record.procedures_performed)}
                      </td>
                      <td className="px-3 py-4 text-zinc-600">
                        {formatInteger(record.staff_on_duty_count)}
                      </td>
                      <td className="px-3 py-4 text-zinc-600">
                        {(record.procedures_performed / record.staff_on_duty_count).toFixed(2)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(record.id);
                              setFormState({
                                department_id: record.department_id,
                                procedures_performed: String(record.procedures_performed),
                                staff_on_duty_count: String(record.staff_on_duty_count),
                                notes: record.notes ?? "",
                              });
                            }}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm("Delete this productivity record?");
                              if (confirmed) {
                                deleteMutation.mutate(record.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:cursor-pointer hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
