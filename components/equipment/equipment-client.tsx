"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Factory,
  Loader2,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import StatCard from "@/components/dashboard/stat-card";
import { formatInteger, formatMonthLabel } from "@/components/dashboard/utils";
import MonitoringBarChart from "@/components/monitoring/bar-chart";
import TrendChart from "@/components/monitoring/trend-chart";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import MonthPicker from "@/components/ui/month-picker";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import type { UserRole } from "@/types/database";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";
import type {
  EquipmentAssetItem,
  EquipmentRecordItem,
  EquipmentSummaryResponse,
  MonitoringDepartment,
} from "@/types/monitoring";

type Props = {
  role: UserRole;
  defaultDepartmentId: string | null;
  availableDepartments: MonitoringDepartment[];
};

type AssetFormState = {
  department_id: string;
  name: string;
  category: string;
  is_active: boolean;
};

type RecordFormState = {
  equipment_asset_id: string;
  available_hours: string;
  actual_usage_hours: string;
  status: "active" | "idle" | "maintenance";
  notes: string;
};

const emptyAsset: AssetFormState = {
  department_id: "",
  name: "",
  category: "",
  is_active: true,
};

const emptyRecord: RecordFormState = {
  equipment_asset_id: "",
  available_hours: "",
  actual_usage_hours: "",
  status: "active",
  notes: "",
};

const inputClassName =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

const primaryActionClassName =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900";

const secondaryActionClassName =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function EquipmentClient({
  role,
  defaultDepartmentId,
  availableDepartments,
}: Props) {
  const queryClient = useQueryClient();
  const isLeadership = role === "avp" || role === "division_head";
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? "");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<AssetFormState>({
    ...emptyAsset,
    department_id: defaultDepartmentId ?? availableDepartments[0]?.id ?? "",
  });
  const [recordForm, setRecordForm] = useState<RecordFormState>(emptyRecord);

  const summaryQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", selectedMonth);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId, selectedMonth]);

  const assetsQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId]);

  const recordsQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "200");
    params.set("report_month", `${selectedMonth}-01`);
    if (selectedDepartmentId) params.set("department_id", selectedDepartmentId);
    return params.toString();
  }, [selectedDepartmentId, selectedMonth]);

  const { data: summary, isLoading: loadingSummary, error: summaryError } =
    useQuery<EquipmentSummaryResponse>({
      queryKey: ["equipment-summary", summaryQuery],
      queryFn: async () => {
        const response = await fetch(`/api/equipment/summary?${summaryQuery}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to load equipment summary.");
        return response.json();
      },
      staleTime: WORKSPACE_QUERY_STALE_TIME,
      gcTime: WORKSPACE_QUERY_GC_TIME,
      refetchOnWindowFocus: false,
      placeholderData: (previous) => previous,
    });

  const { data: assetsResponse, isLoading: loadingAssets, error: assetsError } = useQuery<{
    data: EquipmentAssetItem[];
  }>({
    queryKey: ["equipment-assets", assetsQuery],
    queryFn: async () => {
      const response = await fetch(`/api/equipment/assets?${assetsQuery}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load equipment assets.");
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const { data: recordsResponse, isLoading: loadingRecords, error: recordsError } = useQuery<{
    data: EquipmentRecordItem[];
  }>({
    queryKey: ["equipment-records", recordsQuery],
    queryFn: async () => {
      const response = await fetch(`/api/equipment/records?${recordsQuery}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load equipment records.");
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const assets = assetsResponse?.data ?? [];
  const records = recordsResponse?.data ?? [];

  function resetAssetForm() {
    setEditingAssetId(null);
    setAssetForm({
      ...emptyAsset,
      department_id:
        role === "department_head"
          ? defaultDepartmentId ?? ""
          : selectedDepartmentId || availableDepartments[0]?.id || "",
    });
  }

  function resetRecordForm() {
    setEditingRecordId(null);
    setRecordForm(emptyRecord);
  }

  function closeAssetModal() {
    setIsAssetModalOpen(false);
    resetAssetForm();
  }

  function closeRecordModal() {
    setIsRecordModalOpen(false);
    resetRecordForm();
  }

  const assetMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        department_id: role === "department_head" ? defaultDepartmentId : assetForm.department_id,
        name: assetForm.name.trim(),
        category: assetForm.category.trim(),
        is_active: assetForm.is_active,
      };
      const response = await fetch(
        editingAssetId ? `/api/equipment/assets/${editingAssetId}` : "/api/equipment/assets",
        {
          method: editingAssetId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error ?? "Failed to save equipment asset.");
      }
    },
    onSuccess: () => {
      toast.success(editingAssetId ? "Equipment asset updated." : "Equipment asset saved.");
      closeAssetModal();
      void queryClient.invalidateQueries({ queryKey: ["equipment-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["equipment-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        report_month: `${selectedMonth}-01`,
        equipment_asset_id: recordForm.equipment_asset_id,
        available_hours: Number(recordForm.available_hours || 0),
        actual_usage_hours: Number(recordForm.actual_usage_hours || 0),
        status: recordForm.status,
        notes: recordForm.notes.trim() || null,
      };
      const response = await fetch(
        editingRecordId ? `/api/equipment/records/${editingRecordId}` : "/api/equipment/records",
        {
          method: editingRecordId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error ?? "Failed to save equipment record.");
      }
    },
    onSuccess: () => {
      toast.success(editingRecordId ? "Equipment record updated." : "Equipment record saved.");
      closeRecordModal();
      void queryClient.invalidateQueries({ queryKey: ["equipment-records"] });
      void queryClient.invalidateQueries({ queryKey: ["equipment-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/equipment/assets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete equipment asset.");
    },
    onSuccess: () => {
      toast.success("Equipment asset deleted.");
      closeAssetModal();
      void queryClient.invalidateQueries({ queryKey: ["equipment-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["equipment-records"] });
      void queryClient.invalidateQueries({ queryKey: ["equipment-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/equipment/records/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete equipment record.");
    },
    onSuccess: () => {
      toast.success("Equipment record deleted.");
      closeRecordModal();
      void queryClient.invalidateQueries({ queryKey: ["equipment-records"] });
      void queryClient.invalidateQueries({ queryKey: ["equipment-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredAssets = selectedDepartmentId
    ? assets.filter((asset) => asset.department_id === selectedDepartmentId)
    : assets;

  const comparisonData = (summary?.department_summary ?? []).slice(0, 6).map((row) => ({
    name: row.department_name,
    value: row.utilization_pct,
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.2)]">
        <div className="px-6 py-7 md:px-8">
          <div className="flex flex-col gap-6">
            <div className="max-w-4xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Equipment Utilization
              </p>
              <h1 className="mt-3 text-[clamp(1.9rem,3.9vw,3rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)] xl:whitespace-nowrap">
                Catalog and review equipment utilization
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use one month filter to manage assets, encode utilization, and review department rollups.
              </p>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex flex-wrap gap-3">
                {isLeadership ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetAssetForm();
                      setIsAssetModalOpen(true);
                    }}
                    className={primaryActionClassName}
                  >
                    <Factory className="h-4 w-4" />
                    Add equipment asset
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    resetRecordForm();
                    setIsRecordModalOpen(true);
                  }}
                  className={secondaryActionClassName}
                >
                  <Wrench className="h-4 w-4" />
                  Encode utilization
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(15rem,16rem)_minmax(16rem,20rem)]">
                <MonthPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  className="min-w-[15rem] rounded-2xl border-white/80 bg-white/90 shadow-sm"
                />
                {role !== "department_head" ? (
                  <Select
                    value={selectedDepartmentId}
                    onChange={setSelectedDepartmentId}
                    className="min-w-[18rem] rounded-2xl border-white/80 bg-white/90 shadow-sm"
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
        </div>
      </section>

      {(summaryError || assetsError || recordsError) && (
        <InlineErrorBanner
          message={
            summaryError?.message
            ?? assetsError?.message
            ?? recordsError?.message
            ?? "Failed to load equipment data."
          }
        />
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Catalog Assets"
          value={summary ? formatInteger(summary.totals.asset_count) : "-"}
          icon={Factory}
          iconColor="text-blue-800 bg-blue-50"
          subValue={`${summary?.totals.reported_asset_count ?? 0} with records`}
        />
        <StatCard
          title="Available Hours"
          value={summary ? formatInteger(summary.totals.available_hours) : "-"}
          icon={Save}
          iconColor="text-emerald-700 bg-emerald-50"
          subValue={formatMonthLabel(selectedMonth)}
        />
        <StatCard
          title="Actual Usage"
          value={summary ? formatInteger(summary.totals.actual_usage_hours) : "-"}
          icon={Wrench}
          iconColor="text-violet-700 bg-violet-50"
          subValue="Hours encoded"
        />
        <StatCard
          title="Weighted Utilization"
          value={summary ? `${summary.totals.utilization_pct.toFixed(1)}%` : "-"}
          icon={Factory}
          iconColor="text-amber-700 bg-amber-50"
          subValue={`${summary?.totals.status_breakdown.maintenance ?? 0} maintenance`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TrendChart
          title="Weighted utilization trend"
          description="Each month is computed from total actual usage divided by total available hours."
          data={summary?.trend ?? []}
          series={[{ key: "utilization_pct", label: "Utilization %", color: "#1d4ed8" }]}
          valueFormatter={(value) => `${value.toFixed(1)}%`}
        />
        <MonitoringBarChart
          title="Department comparison"
          description="Leadership can compare utilization using the same weighted aggregation logic."
          data={comparisonData}
          xKey="name"
          yKey="value"
          color="#0f766e"
          valueFormatter={(value) => `${value.toFixed(1)}%`}
        />
      </section>

      <section className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            {formatMonthLabel(selectedMonth)} asset rows
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Review this month&apos;s encoded rows and jump back into the matching asset or record when you need to correct something.
          </p>

          {(loadingSummary || loadingAssets || loadingRecords) ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
            </div>
          ) : (summary?.asset_rows.length ?? 0) === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
              No equipment rows found for this month.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-zinc-100 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-3">Equipment</th>
                    <th className="px-3 py-3">Available</th>
                    <th className="px-3 py-3">Actual</th>
                    <th className="px-3 py-3">Utilization</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.asset_rows.map((row) => {
                    const record = records.find((item) => item.equipment_asset_id === row.equipment_asset_id);

                    return (
                      <tr key={row.equipment_asset_id} className="border-b border-zinc-100 last:border-b-0">
                        <td className="px-3 py-4">
                          <p className="font-medium text-zinc-800">{row.equipment_name}</p>
                          <p className="text-xs text-zinc-500">{row.department_name} | {row.category}</p>
                        </td>
                        <td className="px-3 py-4 text-zinc-600">{row.available_hours.toFixed(2)}</td>
                        <td className="px-3 py-4 text-zinc-600">{row.actual_usage_hours.toFixed(2)}</td>
                        <td className="px-3 py-4 text-zinc-600">{row.utilization_pct.toFixed(1)}%</td>
                        <td className="px-3 py-4 text-zinc-600">{row.status ?? "No entry"}</td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            {isLeadership && row.status === null ? (
                              <button
                                type="button"
                                onClick={() => {
                                  resetRecordForm();
                                  setRecordForm({ ...emptyRecord, equipment_asset_id: row.equipment_asset_id });
                                  setIsRecordModalOpen(true);
                                }}
                                className="whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-100"
                              >
                                Add record
                              </button>
                            ) : null}
                            {record ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecordId(record.id);
                                    setRecordForm({
                                      equipment_asset_id: record.equipment_asset_id,
                                      available_hours: String(record.available_hours),
                                      actual_usage_hours: String(record.actual_usage_hours),
                                      status: record.status,
                                      notes: record.notes ?? "",
                                    });
                                    setIsRecordModalOpen(true);
                                  }}
                                  className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
                                >
                                  Edit record
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm("Delete this equipment record?")) {
                                      deleteRecordMutation.mutate(record.id);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:cursor-pointer hover:bg-red-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </>
                            ) : null}
                            {isLeadership && record === undefined ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAssetId(row.equipment_asset_id);
                                  const asset = assets.find((item) => item.id === row.equipment_asset_id);
                                  if (asset) {
                                    setAssetForm({
                                      department_id: asset.department_id,
                                      name: asset.name,
                                      category: asset.category,
                                      is_active: asset.is_active,
                                    });
                                    setIsAssetModalOpen(true);
                                  }
                                }}
                                className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
                              >
                                Edit asset
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

      </section>

      {isLeadership ? (
        <Modal
          isOpen={isAssetModalOpen}
          onClose={closeAssetModal}
          title={editingAssetId ? "Edit equipment asset" : "Add equipment asset"}
        >
          <div className="space-y-4">
            <p className="text-sm leading-7 text-slate-600">
              Keep the asset catalog clean before you encode monthly utilization.
            </p>
            <Select
              value={assetForm.department_id}
              onChange={(value) => setAssetForm((current) => ({ ...current, department_id: value }))}
              options={availableDepartments.map((department) => ({
                value: department.id,
                label: department.name,
              }))}
              dropdownMinWidth={288}
            />
            <input
              value={assetForm.name}
              onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))}
              className={inputClassName}
              placeholder="Equipment name"
            />
            <input
              value={assetForm.category}
              onChange={(event) => setAssetForm((current) => ({ ...current, category: event.target.value }))}
              className={inputClassName}
              placeholder="Category"
            />
            <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={assetForm.is_active}
                onChange={(event) => setAssetForm((current) => ({ ...current, is_active: event.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-blue-700"
              />
              Keep asset active
            </label>

            {assets.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Catalog list
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setEditingAssetId(asset.id);
                        setAssetForm({
                          department_id: asset.department_id,
                          name: asset.name,
                          category: asset.category,
                          is_active: asset.is_active,
                        });
                      }}
                      className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
                    >
                      {asset.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => assetMutation.mutate()}
                disabled={assetMutation.isPending || !assetForm.department_id || !assetForm.name.trim() || !assetForm.category.trim()}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:opacity-60"
              >
                {assetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingAssetId ? "Update asset" : "Save asset"}
              </button>
              <button
                type="button"
                onClick={closeAssetModal}
                className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
              {editingAssetId ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this equipment asset?")) {
                      deleteAssetMutation.mutate(editingAssetId);
                    }
                  }}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition-colors hover:cursor-pointer hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete asset
                </button>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      <Modal
        isOpen={isRecordModalOpen}
        onClose={closeRecordModal}
        title={editingRecordId ? "Edit utilization record" : "Encode utilization"}
      >
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-600">
            Record available hours, actual usage, and asset status for {formatMonthLabel(selectedMonth)}.
          </p>
          <Select
            value={recordForm.equipment_asset_id}
            onChange={(value) => setRecordForm((current) => ({ ...current, equipment_asset_id: value }))}
            options={filteredAssets.map((asset) => ({
              value: asset.id,
              label: `${asset.name} | ${asset.category}`,
            }))}
            dropdownMinWidth={320}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={recordForm.available_hours}
              onChange={(event) => setRecordForm((current) => ({ ...current, available_hours: event.target.value }))}
              className={inputClassName}
              placeholder="Available hours"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={recordForm.actual_usage_hours}
              onChange={(event) => setRecordForm((current) => ({ ...current, actual_usage_hours: event.target.value }))}
              className={inputClassName}
              placeholder="Actual usage hours"
            />
          </div>
          <Select
            value={recordForm.status}
            onChange={(value) => setRecordForm((current) => ({ ...current, status: value as RecordFormState["status"] }))}
            options={[
              { value: "active", label: "Active" },
              { value: "idle", label: "Idle" },
              { value: "maintenance", label: "Maintenance" },
            ]}
          />
          <textarea
            rows={4}
            value={recordForm.notes}
            onChange={(event) => setRecordForm((current) => ({ ...current, notes: event.target.value }))}
            className={`${inputClassName} resize-none`}
            placeholder="Optional notes"
          />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => recordMutation.mutate()}
              disabled={recordMutation.isPending || !recordForm.equipment_asset_id}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:opacity-60"
            >
              {recordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingRecordId ? "Update record" : "Save record"}
            </button>
            <button
              type="button"
              onClick={closeRecordModal}
              className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            {editingRecordId ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this equipment record?")) {
                    deleteRecordMutation.mutate(editingRecordId);
                  }
                }}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition-colors hover:cursor-pointer hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete record
              </button>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
