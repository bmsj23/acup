"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import Select from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";
import {
  NON_REVENUE_DEPARTMENT_CODES,
  NON_CENSUS_DEPARTMENT_CODES,
  MEDICATION_ERROR_DEPARTMENT_CODES,
  type DepartmentCode,
} from "@/lib/constants/departments";
import type { MetricsInputFormProps, Subdepartment } from "./types";
import { toToday } from "./types";
import TransactionCategoriesSection from "./transaction-categories-section";
import RevenueSection from "./revenue-section";
import CensusSection from "./census-section";

export default function MetricsInputForm({
  role,
  defaultDepartmentId,
  availableDepartments,
  onSaved,
  redirectOnSave,
}: MetricsInputFormProps) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? availableDepartments[0]?.id ?? "");
  const [subdepartmentId, setSubdepartmentId] = useState("");
  const [metricDate, setMetricDate] = useState(toToday());
  const [revenueTotal, setRevenueTotal] = useState("0");
  const [pharmacyRevenueInpatient, setPharmacyRevenueInpatient] = useState("");
  const [pharmacyRevenueOpd, setPharmacyRevenueOpd] = useState("");
  const [monthlyInputCount, setMonthlyInputCount] = useState("0");
  const [censusTotal, setCensusTotal] = useState("0");
  const [censusOpd, setCensusOpd] = useState("0");
  const [censusEr, setCensusEr] = useState("0");
  const [censusWalkIn, setCensusWalkIn] = useState("");
  const [censusInpatient, setCensusInpatient] = useState("");
  const [equipmentUtilizationPct, setEquipmentUtilizationPct] = useState("0");
  const [medicationErrorCount, setMedicationErrorCount] = useState("0");
  const [notes, setNotes] = useState("");
  const [subdepartments, setSubdepartments] = useState<Subdepartment[]>([]);
  const [, setSubdeptLoading] = useState(false);
  const [subdeptError, setSubdeptError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [categoryCounts, setCategoryCounts] = useState<Record<string, string>>({});

  const selectedDepartment = useMemo(
    () => availableDepartments.find((item) => item.id === departmentId) ?? null,
    [availableDepartments, departmentId],
  );

  const deptCode = (selectedDepartment?.code ?? "") as DepartmentCode;
  const isNonRevenue = NON_REVENUE_DEPARTMENT_CODES.includes(deptCode);
  const isNonCensus = NON_CENSUS_DEPARTMENT_CODES.includes(deptCode);
  const showMedicationErrors = MEDICATION_ERROR_DEPARTMENT_CODES.includes(deptCode);
  const showPharmacyFields = deptCode === "PHAR";
  const isMedicalRecords = deptCode === "MEDR";

  useEffect(() => {
    if (!departmentId) { setSubdepartments([]); return; }
    async function loadSubdepartments() {
      setSubdeptLoading(true);
      setSubdeptError(null);
      try {
        const response = await fetch(`/api/subdepartments?department_id=${departmentId}&limit=200`, { method: "GET", credentials: "include" });
        if (!response.ok) { setSubdepartments([]); setSubdeptError("Failed to load subdepartments."); return; }
        const payload = (await response.json()) as { data: Subdepartment[] };
        setSubdepartments(payload.data ?? []);
      } catch { setSubdepartments([]); setSubdeptError("Failed to load subdepartments."); }
      finally { setSubdeptLoading(false); }
    }
    void loadSubdepartments();
  }, [departmentId]);

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function setCategoryCount(category: string, value: string) {
    setCategoryCounts((prev) => ({ ...prev, [category]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (isMedicalRecords && selectedCategories.size > 0) {
        const entries = Array.from(selectedCategories).map((cat) => ({
          category: cat,
          // eslint-disable-next-line security/detect-object-injection
          count: Number(categoryCounts[cat] || 0),
        }));
        const txResponse = await fetch("/api/transaction-categories", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ metric_date: metricDate, department_id: departmentId, entries }),
        });
        if (!txResponse.ok) {
          const txError = (await txResponse.json().catch(() => null)) as { error?: string } | null;
          setError(txError?.error ?? "Failed to save transaction categories.");
          return;
        }
      }

      const payload: Record<string, unknown> = {
        metric_date: metricDate,
        department_id: departmentId,
        subdepartment_id: subdepartmentId || null,
        revenue_total: isNonRevenue ? 0 : Number(revenueTotal || 0),
        pharmacy_revenue_inpatient: showPharmacyFields ? (pharmacyRevenueInpatient === "" ? null : Number(pharmacyRevenueInpatient)) : null,
        pharmacy_revenue_opd: showPharmacyFields ? (pharmacyRevenueOpd === "" ? null : Number(pharmacyRevenueOpd)) : null,
        monthly_input_count: Number(monthlyInputCount || 0),
        census_total: isNonCensus ? 0 : Number(censusTotal || 0),
        census_opd: isNonCensus ? 0 : Number(censusOpd || 0),
        census_er: isNonCensus ? 0 : Number(censusEr || 0),
        census_walk_in: isNonCensus ? null : (censusWalkIn === "" ? null : Number(censusWalkIn)),
        census_inpatient: isNonCensus ? null : (censusInpatient === "" ? null : Number(censusInpatient)),
        equipment_utilization_pct: Number(equipmentUtilizationPct || 0),
        notes: notes.trim() ? notes.trim() : null,
      };
      if (showMedicationErrors) payload.medication_error_count = Number(medicationErrorCount || 0);

      const response = await fetch("/api/metrics", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const payloadError = (await response.json().catch(() => null)) as { error?: string; details?: Record<string, string[]> } | null;
        if (payloadError?.details) {
          const firstDetail = Object.values(payloadError.details)[0]?.[0];
          setError(firstDetail ?? payloadError.error ?? "Failed to submit metrics.");
        } else { setError(payloadError?.error ?? "Failed to submit metrics."); }
        return;
      }

      setMessage("Department metrics saved successfully.");
      if (redirectOnSave) { router.push(redirectOnSave); return; }
      if (onSaved) await onSaved();
    } catch { setError("Failed to submit metrics."); }
    finally { setSubmitting(false); }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Record Details</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Date</label>
            <DatePicker value={metricDate} onChange={setMetricDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Department</label>
            <Select
              value={departmentId}
              onChange={(val) => { setDepartmentId(val); setSubdepartmentId(""); setSelectedCategories(new Set()); setCategoryCounts({}); }}
              disabled={role === "department_head"}
              options={availableDepartments.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="Select department"
            />
          </div>
          {subdepartments.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Subdepartment</label>
              <Select
                value={subdepartmentId}
                onChange={setSubdepartmentId}
                options={[{ value: "", label: "Department Total" }, ...subdepartments.map((item) => ({ value: item.id, label: item.name }))]}
              />
              {subdeptError ? <p className="mt-1 text-xs text-red-600">{subdeptError}</p> : null}
            </div>
          )}
        </div>
      </div>

      {isMedicalRecords && (
        <TransactionCategoriesSection
          selectedCategories={selectedCategories}
          categoryCounts={categoryCounts}
          onToggle={toggleCategory}
          onCountChange={setCategoryCount}
        />
      )}

      {!isNonRevenue && (
        <RevenueSection
          revenueTotal={revenueTotal}
          pharmacyRevenueInpatient={pharmacyRevenueInpatient}
          pharmacyRevenueOpd={pharmacyRevenueOpd}
          showPharmacyFields={showPharmacyFields}
          onRevenueTotalChange={setRevenueTotal}
          onPharmacyInpatientChange={setPharmacyRevenueInpatient}
          onPharmacyOpdChange={setPharmacyRevenueOpd}
        />
      )}

      {!isNonCensus && (
        <CensusSection
          censusTotal={censusTotal}
          censusOpd={censusOpd}
          censusEr={censusEr}
          censusWalkIn={censusWalkIn}
          censusInpatient={censusInpatient}
          onCensusTotalChange={setCensusTotal}
          onCensusOpdChange={setCensusOpd}
          onCensusErChange={setCensusEr}
          onCensusWalkInChange={setCensusWalkIn}
          onCensusInpatientChange={setCensusInpatient}
        />
      )}

      {showMedicationErrors && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Medication Error Monitoring</p>
          <div className="max-w-xs">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Medication Error Count</label>
            <input
              type="number" min="0" value={medicationErrorCount}
              onChange={(event) => setMedicationErrorCount(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Operations</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Monthly Input Count</label>
            <input
              type="number" min="0" value={monthlyInputCount}
              onChange={(event) => setMonthlyInputCount(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Equipment Utilization (%)</label>
            <input
              type="number" min="0" max="100" step="0.01" value={equipmentUtilizationPct}
              onChange={(event) => setEquipmentUtilizationPct(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Notes <span className="normal-case font-normal">(optional)</span>
        </p>
        <textarea
          value={notes} onChange={(event) => setNotes(event.target.value)} rows={3}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 resize-none"
          placeholder="Optional context or remarks for this entry"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
        </div>
        <button
          type="submit" disabled={submitting || !departmentId}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {submitting ? "Saving..." : "Save Metrics"}
        </button>
      </div>
    </form>
  );
}
