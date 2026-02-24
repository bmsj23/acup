"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Subdepartment = {
  id: string;
  department_id: string;
  name: string;
  code: string;
};

type MetricsInputFormProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId?: string | null;
  availableDepartments: Department[];
  onSaved?: () => Promise<void> | void;
  redirectOnSave?: string;
};

function toToday() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [notes, setNotes] = useState("");
  const [subdepartments, setSubdepartments] = useState<Subdepartment[]>([]);
  const [subdeptLoading, setSubdeptLoading] = useState(false);
  const [subdeptError, setSubdeptError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedDepartment = useMemo(
    () => availableDepartments.find((item) => item.id === departmentId) ?? null,
    [availableDepartments, departmentId],
  );

  const showPharmacyFields = selectedDepartment?.code === "PHAR";

  useEffect(() => {
    if (!departmentId) {
      setSubdepartments([]);
      return;
    }

    async function loadSubdepartments() {
      setSubdeptLoading(true);
      setSubdeptError(null);

      try {
        const response = await fetch(
          `/api/subdepartments?department_id=${departmentId}&limit=200`,
          { method: "GET", credentials: "include" },
        );

        if (!response.ok) {
          setSubdepartments([]);
          setSubdeptError("Failed to load subdepartments.");
          return;
        }

        const payload = (await response.json()) as {
          data: Subdepartment[];
        };

        setSubdepartments(payload.data ?? []);
      } catch {
        setSubdepartments([]);
        setSubdeptError("Failed to load subdepartments.");
      } finally {
        setSubdeptLoading(false);
      }
    }

    void loadSubdepartments();
  }, [departmentId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      metric_date: metricDate,
      department_id: departmentId,
      subdepartment_id: subdepartmentId || null,
      revenue_total: Number(revenueTotal || 0),
      pharmacy_revenue_inpatient: showPharmacyFields
        ? pharmacyRevenueInpatient === ""
          ? null
          : Number(pharmacyRevenueInpatient)
        : null,
      pharmacy_revenue_opd: showPharmacyFields
        ? pharmacyRevenueOpd === ""
          ? null
          : Number(pharmacyRevenueOpd)
        : null,
      monthly_input_count: Number(monthlyInputCount || 0),
      census_total: Number(censusTotal || 0),
      census_opd: Number(censusOpd || 0),
      census_er: Number(censusEr || 0),
      census_walk_in: censusWalkIn === "" ? null : Number(censusWalkIn),
      census_inpatient: censusInpatient === "" ? null : Number(censusInpatient),
      equipment_utilization_pct: Number(equipmentUtilizationPct || 0),
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      const response = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = (await response.json().catch(() => null)) as
          | { error?: string; details?: Record<string, string[]> }
          | null;

        if (payloadError?.details) {
          const firstDetail = Object.values(payloadError.details)[0]?.[0];
          setError(firstDetail ?? payloadError.error ?? "Failed to submit metrics.");
        } else {
          setError(payloadError?.error ?? "Failed to submit metrics.");
        }
        return;
      }

      setMessage("Department metrics saved successfully.");
      if (redirectOnSave) {
        router.push(redirectOnSave);
        return;
      }
      if (onSaved) {
        await onSaved();
      }
    } catch {
      setError("Failed to submit metrics.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* record details */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Record Details</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Date</label>
            <input
              type="date"
              value={metricDate}
              onChange={(event) => setMetricDate(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Department</label>
            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setSubdepartmentId("");
              }}
              disabled={role === "department_head"}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
              required
            >
              {availableDepartments.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          {subdepartments.length > 0 || subdeptLoading ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Subdepartment</label>
              <select
                value={subdepartmentId}
                onChange={(event) => setSubdepartmentId(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
              >
                <option value="">Department Total</option>
                {subdepartments.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {subdeptLoading ? <p className="mt-1 text-xs text-zinc-400">Loading...</p> : null}
              {subdeptError ? <p className="mt-1 text-xs text-red-600">{subdeptError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* revenue */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Revenue</p>
        <div className={`grid gap-4 ${showPharmacyFields ? "md:grid-cols-3" : "max-w-xs"}`}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Revenue Total (PHP)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={revenueTotal}
              onChange={(event) => setRevenueTotal(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
          {showPharmacyFields ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Pharmacy Revenue — Inpatient</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pharmacyRevenueInpatient}
                  onChange={(event) => setPharmacyRevenueInpatient(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Pharmacy Revenue — OPD</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pharmacyRevenueOpd}
                  onChange={(event) => setPharmacyRevenueOpd(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* patient census */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Patient Census</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Census Total</label>
            <input
              type="number"
              min="0"
              value={censusTotal}
              onChange={(event) => setCensusTotal(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">OPD</label>
            <input
              type="number"
              min="0"
              value={censusOpd}
              onChange={(event) => setCensusOpd(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">ER</label>
            <input
              type="number"
              min="0"
              value={censusEr}
              onChange={(event) => setCensusEr(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Walk-in <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={censusWalkIn}
              onChange={(event) => setCensusWalkIn(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Inpatient <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={censusInpatient}
              onChange={(event) => setCensusInpatient(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>
      </div>

      {/* operations */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Operations</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Monthly Input Count</label>
            <input
              type="number"
              min="0"
              value={monthlyInputCount}
              onChange={(event) => setMonthlyInputCount(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Equipment Utilization (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={equipmentUtilizationPct}
              onChange={(event) => setEquipmentUtilizationPct(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              required
            />
          </div>
        </div>
      </div>

      {/* notes */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Notes <span className="normal-case font-normal">(optional)</span>
        </p>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 resize-none"
          placeholder="Optional context or remarks for this entry"
        />
      </div>

      {/* footer */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
        </div>
        <button
          type="submit"
          disabled={submitting || !departmentId}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {submitting ? "Saving..." : "Save Metrics"}
        </button>
      </div>
    </form>
  );
}
