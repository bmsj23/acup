"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatMonthLabel } from "@/components/dashboard/utils";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import MonitoringBarChart from "@/components/monitoring/bar-chart";
import TrendChart from "@/components/monitoring/trend-chart";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import MonthPicker from "@/components/ui/month-picker";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { TRAINING_ACCEPT_ATTRIBUTE } from "@/lib/constants/training";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";
import type { UserRole } from "@/types/database";
import type {
  MonitoringDepartment,
  TrainingComplianceItem,
  TrainingModuleItem,
  TrainingSummaryResponse,
} from "@/types/monitoring";

type Props = {
  role: UserRole;
  defaultDepartmentId: string | null;
  availableDepartments: MonitoringDepartment[];
};

type ModuleFormState = {
  title: string;
  description: string;
  department_id: string;
  is_system_wide: boolean;
  publish_now: boolean;
  file: File | null;
};

type ComplianceFormState = {
  training_module_id: string;
  department_id: string;
  assigned_staff_count: string;
  completed_staff_count: string;
};

const emptyModuleForm: ModuleFormState = {
  title: "",
  description: "",
  department_id: "",
  is_system_wide: false,
  publish_now: true,
  file: null,
};

const emptyComplianceForm: ComplianceFormState = {
  training_module_id: "",
  department_id: "",
  assigned_staff_count: "0",
  completed_staff_count: "0",
};

const primaryActionClassName =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900";

const secondaryActionClassName =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50";

const subtleActionClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function TrainingClient({
  role,
  defaultDepartmentId,
  availableDepartments,
}: Props) {
  const queryClient = useQueryClient();
  const isLeadership = role === "avp" || role === "division_head";
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? "");
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingComplianceId, setEditingComplianceId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>({
    ...emptyModuleForm,
    department_id: defaultDepartmentId ?? availableDepartments[0]?.id ?? "",
  });
  const [complianceForm, setComplianceForm] = useState<ComplianceFormState>({
    ...emptyComplianceForm,
    department_id: defaultDepartmentId ?? availableDepartments[0]?.id ?? "",
  });

  const summaryQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", selectedMonth);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId, selectedMonth]);

  const modulesQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId]);

  const complianceQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    params.set("report_month", `${selectedMonth}-01`);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId, selectedMonth]);

  const { data: summary, isLoading: loadingSummary, error: summaryError } =
    useQuery<TrainingSummaryResponse>({
      queryKey: ["training-summary", summaryQuery],
      queryFn: async () => {
        const response = await fetch(`/api/training/summary?${summaryQuery}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to load training summary.");
        return response.json();
      },
      staleTime: WORKSPACE_QUERY_STALE_TIME,
      gcTime: WORKSPACE_QUERY_GC_TIME,
      refetchOnWindowFocus: false,
      placeholderData: (previous) => previous,
    });

  const { data: modulesResponse, isLoading: loadingModules, error: modulesError } = useQuery<{
    data: TrainingModuleItem[];
  }>({
    queryKey: ["training-modules", modulesQuery],
    queryFn: async () => {
      const response = await fetch(`/api/training/modules?${modulesQuery}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load training modules.");
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const { data: complianceResponse, isLoading: loadingCompliance, error: complianceError } = useQuery<{
    data: TrainingComplianceItem[];
  }>({
    queryKey: ["training-compliance", complianceQuery],
    queryFn: async () => {
      const response = await fetch(`/api/training/compliance?${complianceQuery}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load training compliance.");
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const modules = useMemo(
    () => modulesResponse?.data ?? [],
    [modulesResponse?.data],
  );
  const featuredModules = useMemo(
    () => modules.slice(0, 4),
    [modules],
  );
  const complianceRows = useMemo(
    () => complianceResponse?.data ?? [],
    [complianceResponse?.data],
  );
  const moduleNameById = useMemo(
    () => new Map(modules.map((trainingModule) => [trainingModule.id, trainingModule.title])),
    [modules],
  );
  const departmentComplianceChartData = (summary?.department_compliance ?? [])
    .slice(0, 6)
    .map((row) => ({
      name: row.department_name,
      value: row.completion_rate,
    }));

  function resetModuleForm() {
    setEditingModuleId(null);
    setModuleForm({
      ...emptyModuleForm,
      department_id:
        role === "department_head"
          ? defaultDepartmentId ?? ""
          : selectedDepartmentId || availableDepartments[0]?.id || "",
    });
  }

  function resetComplianceForm() {
    setEditingComplianceId(null);
    setComplianceForm({
      ...emptyComplianceForm,
      department_id:
        role === "department_head"
          ? defaultDepartmentId ?? ""
          : selectedDepartmentId || availableDepartments[0]?.id || "",
    });
  }

  function closeModuleModal() {
    setIsModuleModalOpen(false);
    resetModuleForm();
  }

  function closeComplianceModal() {
    setIsComplianceModalOpen(false);
    resetComplianceForm();
  }

  const moduleMutation = useMutation({
    mutationFn: async () => {
      if (editingModuleId) {
        const response = await fetch(`/api/training/modules/${editingModuleId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: moduleForm.title.trim(),
            description: moduleForm.description.trim(),
            department_id: moduleForm.is_system_wide ? null : moduleForm.department_id,
            is_system_wide: isLeadership ? moduleForm.is_system_wide : false,
            published_at: moduleForm.publish_now ? new Date().toISOString() : null,
          }),
        });
        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(error?.error ?? "Failed to update training module.");
        }
        return;
      }

      const payload = new FormData();
      payload.set("title", moduleForm.title.trim());
      payload.set("description", moduleForm.description.trim());
      payload.set("department_id", moduleForm.department_id);
      payload.set("is_system_wide", String(isLeadership ? moduleForm.is_system_wide : false));
      payload.set("publish_now", String(moduleForm.publish_now));
      if (moduleForm.file) payload.set("file", moduleForm.file);

      const response = await fetch("/api/training/modules", {
        method: "POST",
        credentials: "include",
        body: payload,
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error ?? "Failed to create training module.");
      }
    },
    onSuccess: () => {
      toast.success(editingModuleId ? "Training module updated." : "Training module created.");
      closeModuleModal();
      void queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      void queryClient.invalidateQueries({ queryKey: ["training-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const complianceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        report_month: `${selectedMonth}-01`,
        training_module_id: complianceForm.training_module_id,
        department_id: role === "department_head" ? defaultDepartmentId : complianceForm.department_id,
        assigned_staff_count: Number(complianceForm.assigned_staff_count || 0),
        completed_staff_count: Number(complianceForm.completed_staff_count || 0),
      };

      const response = await fetch(
        editingComplianceId
          ? `/api/training/compliance/${editingComplianceId}`
          : "/api/training/compliance",
        {
          method: editingComplianceId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error ?? "Failed to save compliance record.");
      }
    },
    onSuccess: () => {
      toast.success(editingComplianceId ? "Compliance record updated." : "Compliance record saved.");
      closeComplianceModal();
      void queryClient.invalidateQueries({ queryKey: ["training-compliance"] });
      void queryClient.invalidateQueries({ queryKey: ["training-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/training/modules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete training module.");
    },
    onSuccess: () => {
      toast.success("Training module deleted.");
      resetModuleForm();
      void queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      void queryClient.invalidateQueries({ queryKey: ["training-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["training-compliance"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteComplianceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/training/compliance/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete compliance record.");
    },
    onSuccess: () => {
      toast.success("Compliance record deleted.");
      resetComplianceForm();
      void queryClient.invalidateQueries({ queryKey: ["training-compliance"] });
      void queryClient.invalidateQueries({ queryKey: ["training-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      {(summaryError || modulesError || complianceError) && (
        <InlineErrorBanner
          message={
            summaryError?.message
            ?? modulesError?.message
            ?? complianceError?.message
            ?? "Failed to load training data."
          }
        />
      )}

      <section className="rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] px-6 py-7 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.2)]">
        <div className="flex flex-col gap-6">
          <div className="max-w-4xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Department learning
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4vw,3.05rem)] font-semibold leading-[0.98] text-slate-950 [font-family:var(--font-playfair)]">
              Training hub
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Publish modules, review learner access, and update verified compliance from one protected workspace.
            </p>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsModuleModalOpen(true)}
                className={primaryActionClassName}
              >
                <FilePlus2 className="h-4 w-4" />
                Publish module
              </button>
              <button
                type="button"
                onClick={() => setIsComplianceModalOpen(true)}
                className={secondaryActionClassName}
              >
                <ClipboardCheck className="h-4 w-4" />
                Record compliance
              </button>
              <OptimisticRouteLink
                href="/training/modules"
                className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
              >
                Module library
              </OptimisticRouteLink>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(15rem,16rem)_minmax(16rem,20rem)]">
              <MonthPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                className="rounded-2xl border-white/80 bg-white/90 shadow-sm"
              />
              {role !== "department_head" ? (
                <Select
                  value={selectedDepartmentId}
                  onChange={setSelectedDepartmentId}
                  className="min-w-[16rem] rounded-2xl border-white/80 bg-white/90 shadow-sm"
                  dropdownMinWidth={288}
                  options={[
                    { value: "", label: "All Departments" },
                    ...availableDepartments.map((department) => ({
                      value: department.id,
                      label: department.name,
                    })),
                  ]}
                />
              ) : (
                <div className="flex min-h-14 items-center rounded-2xl border border-white/80 bg-white/90 px-4 text-sm font-medium text-slate-700 shadow-sm">
                  {availableDepartments.find((department) => department.id === selectedDepartmentId)?.name
                    ?? "Assigned department"}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {(loadingSummary || loadingModules || loadingCompliance) && (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
        </div>
      )}

      <section className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Modules</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{summary?.totals.published_module_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Assigned</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{summary?.totals.assigned_staff_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Completed</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{summary?.totals.completed_staff_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{summary?.totals.pending_staff_count ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TrendChart
          title="Compliance trend"
          description={`Monthly completion rate around ${formatMonthLabel(selectedMonth)}.`}
          data={summary?.trend ?? []}
          series={[{ key: "completion_rate", label: "Completion %", color: "#1d4ed8" }]}
          valueFormatter={(value) => `${value.toFixed(1)}%`}
        />
        <MonitoringBarChart
          title="Department compliance"
          description="Leadership oversight uses the same aggregate completion formula shown on the dashboard."
          data={departmentComplianceChartData}
          xKey="name"
          yKey="value"
          color="#0f766e"
          valueFormatter={(value) => `${value.toFixed(1)}%`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Published modules
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                Library preview
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Keep the hub focused on what is live now, then use the full library for deeper browsing.
              </p>
            </div>
            <OptimisticRouteLink
              href="/training/modules"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
            >
              Browse module library
            </OptimisticRouteLink>
          </div>

          <div className="mt-5 space-y-4">
            {featuredModules.length === 0 ? (
              <div className="rounded-[1.45rem] border border-dashed border-zinc-200 bg-zinc-50 px-5 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No published modules yet.</p>
                <p className="mt-2 text-sm text-slate-500">
                  Publish the first module from the action bar above to start the library.
                </p>
              </div>
            ) : (
              featuredModules.map((module) => (
                <div
                  key={module.id}
                  className="rounded-[1.5rem] border border-blue-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-800">
                          {module.is_system_wide
                            ? "System-wide"
                            : module.departments?.name ?? "Department"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            module.published_at
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {module.published_at ? "Published" : "Draft"}
                        </span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-slate-950">{module.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{module.material_file_name}</p>
                      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-600">
                        {module.description}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-72 xl:justify-end">
                      <OptimisticRouteLink
                        href={`/training/modules/${module.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
                      >
                        Open details
                      </OptimisticRouteLink>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingModuleId(module.id);
                          setModuleForm({
                            title: module.title,
                            description: module.description,
                            department_id: module.department_id ?? defaultDepartmentId ?? "",
                            is_system_wide: module.is_system_wide,
                            publish_now: Boolean(module.published_at),
                            file: null,
                          });
                          setIsModuleModalOpen(true);
                        }}
                        className={subtleActionClassName}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this training module?")) {
                            deleteModuleMutation.mutate(module.id);
                          }
                        }}
                        className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {modules.length > featuredModules.length ? (
            <div className="mt-4 rounded-[1.35rem] border border-blue-100/80 bg-blue-50/50 px-4 py-3 text-sm text-slate-600">
              {modules.length - featuredModules.length} more module
              {modules.length - featuredModules.length === 1 ? "" : "s"} available in the full library.
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Monthly compliance
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
              Verified completion records
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {formatMonthLabel(selectedMonth)} progress stays protected and is encoded only after verification.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {complianceRows.length === 0 ? (
              <div className="rounded-[1.45rem] border border-dashed border-zinc-200 bg-zinc-50 px-5 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No compliance records yet.</p>
                <p className="mt-2 text-sm text-slate-500">
                  Record verified completions when the month&apos;s training is confirmed.
                </p>
              </div>
            ) : (
              complianceRows.slice(0, 6).map((row) => {
                const completionRate =
                  row.assigned_staff_count > 0
                    ? Math.min(
                        100,
                        Math.round((row.completed_staff_count / row.assigned_staff_count) * 100),
                      )
                    : 0;

                return (
                  <div
                    key={row.id}
                    className="rounded-[1.45rem] border border-zinc-100 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-950">
                            {moduleNameById.get(row.training_module_id) ?? "Unknown module"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {row.departments?.name ?? "Unknown department"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingComplianceId(row.id);
                              setComplianceForm({
                                training_module_id: row.training_module_id,
                                department_id: row.department_id,
                                assigned_staff_count: String(row.assigned_staff_count),
                                completed_staff_count: String(row.completed_staff_count),
                              });
                              setIsComplianceModalOpen(true);
                            }}
                            className={subtleActionClassName}
                          >
                            Edit record
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Delete this compliance record?")) {
                                deleteComplianceMutation.mutate(row.id);
                              }
                            }}
                            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>
                            {row.completed_staff_count} / {row.assigned_staff_count} completed
                          </span>
                          <span className="font-medium text-slate-800">{completionRate}%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-blue-800"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <Modal
        isOpen={isModuleModalOpen}
        onClose={closeModuleModal}
        title={editingModuleId ? "Edit module" : "Publish module"}
      >
        <div className="space-y-4">
          {isLeadership && (
            <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={moduleForm.is_system_wide}
                onChange={(event) => setModuleForm((current) => ({ ...current, is_system_wide: event.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-blue-700"
              />
              System-wide module
            </label>
          )}
          {!moduleForm.is_system_wide && (
            <Select
              value={moduleForm.department_id}
              onChange={(value) => setModuleForm((current) => ({ ...current, department_id: value }))}
              options={availableDepartments.map((department) => ({
                value: department.id,
                label: department.name,
              }))}
            />
          )}
          <input
            value={moduleForm.title}
            onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            placeholder="Module title"
          />
          <textarea
            rows={4}
            value={moduleForm.description}
            onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            placeholder="Module description"
          />
          {!editingModuleId && (
            <input
              type="file"
              accept={TRAINING_ACCEPT_ATTRIBUTE}
              onChange={(event) => setModuleForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
              className="w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700"
            />
          )}
          <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={moduleForm.publish_now}
              onChange={(event) => setModuleForm((current) => ({ ...current, publish_now: event.target.checked }))}
              className="h-4 w-4 rounded border-zinc-300 text-blue-700"
            />
            Publish immediately
          </label>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => moduleMutation.mutate()}
              disabled={moduleMutation.isPending || !moduleForm.title.trim() || !moduleForm.description.trim() || (!editingModuleId && !moduleForm.file)}
               className="whitespace-nowrap rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:opacity-60"
            >
              {moduleMutation.isPending ? "Saving..." : editingModuleId ? "Update module" : "Publish module"}
            </button>
            <button
              type="button"
              onClick={closeModuleModal}
               className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isComplianceModalOpen}
        onClose={closeComplianceModal}
        title={editingComplianceId ? "Edit compliance" : "Record compliance"}
      >
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-600">
            Compliance is encoded manually after completion is verified offline or operationally.
          </p>
          <Select
            value={complianceForm.training_module_id}
            onChange={(value) => setComplianceForm((current) => ({ ...current, training_module_id: value }))}
            options={modules.map((module) => ({
              value: module.id,
              label: module.title,
            }))}
          />
          {role !== "department_head" && (
            <Select
              value={complianceForm.department_id}
              onChange={(value) => setComplianceForm((current) => ({ ...current, department_id: value }))}
              options={availableDepartments.map((department) => ({
                value: department.id,
                label: department.name,
              }))}
            />
          )}
          <input
            type="number"
            min="0"
            value={complianceForm.assigned_staff_count}
            onChange={(event) => setComplianceForm((current) => ({ ...current, assigned_staff_count: event.target.value }))}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            placeholder="Assigned staff"
          />
          <input
            type="number"
            min="0"
            value={complianceForm.completed_staff_count}
            onChange={(event) => setComplianceForm((current) => ({ ...current, completed_staff_count: event.target.value }))}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            placeholder="Completed staff"
          />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => complianceMutation.mutate()}
              disabled={complianceMutation.isPending || !complianceForm.training_module_id || !(role === "department_head" ? defaultDepartmentId : complianceForm.department_id)}
               className="whitespace-nowrap rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:opacity-60"
            >
              {complianceMutation.isPending ? "Saving..." : editingComplianceId ? "Update compliance" : "Save compliance"}
            </button>
            <button
              type="button"
              onClick={closeComplianceModal}
               className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
