"use client";

import { useEffect, useMemo, useState } from "react";
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
};

function toToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function MetricsInputForm({
  role,
  defaultDepartmentId,
  availableDepartments,
  onSaved,
}: MetricsInputFormProps) {
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
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-zinc-900">Department Data Input</h2>
        <span className="rounded-full bg-blue-800 px-2 py-0.5 text-xs font-medium text-blue-800">
          {role === "department_head" ? "Department Scoped" : "All Departments"}
        </span>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Metric Date
            </label>
            <input
              type="date"
              value={metricDate}
              onChange={(event) => setMetricDate(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#0b3d91] focus:ring-2 focus:ring-[#0b3d91]/10"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setSubdepartmentId("");
              }}
              disabled={role === "department_head"}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-zinc-100"
              required
            >
              {availableDepartments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Subdepartment
            </label>
            <select
              value={subdepartmentId}
              onChange={(event) => setSubdepartmentId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Department Total</option>
              {subdepartments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {subdeptLoading ? <p className="mt-1 text-xs text-zinc-500">Loading subdepartments...</p> : null}
            {subdeptError ? <p className="mt-1 text-xs text-red-600">{subdeptError}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Revenue
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={revenueTotal}
              onChange={(event) => setRevenueTotal(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Monthly Input
            </label>
            <input
              type="number"
              min="0"
              value={monthlyInputCount}
              onChange={(event) => setMonthlyInputCount(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Census Total
            </label>
            <input
              type="number"
              min="0"
              value={censusTotal}
              onChange={(event) => setCensusTotal(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Equipment Utilization (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={equipmentUtilizationPct}
              onChange={(event) => setEquipmentUtilizationPct(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Census OPD
            </label>
            <input
              type="number"
              min="0"
              value={censusOpd}
              onChange={(event) => setCensusOpd(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Census ER
            </label>
            <input
              type="number"
              min="0"
              value={censusEr}
              onChange={(event) => setCensusEr(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Census Walk-in (optional)
            </label>
            <input
              type="number"
              min="0"
              value={censusWalkIn}
              onChange={(event) => setCensusWalkIn(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Census Inpatient (optional)
            </label>
            <input
              type="number"
              min="0"
              value={censusInpatient}
              onChange={(event) => setCensusInpatient(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {showPharmacyFields ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
                Pharmacy Revenue Inpatient
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pharmacyRevenueInpatient}
                onChange={(event) => setPharmacyRevenueInpatient(event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
                Pharmacy Revenue OPD
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pharmacyRevenueOpd}
                onChange={(event) => setPharmacyRevenueOpd(event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Optional context for this daily metric entry"
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={submitting || !departmentId}
          className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {submitting ? "Saving" : "Save Daily Metrics"}
        </button>
      </form>
    </section>
  );
}
