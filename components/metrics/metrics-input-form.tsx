"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import DatePicker from "@/components/ui/date-picker";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import TransactionCategoriesSection from "@/components/metrics/transaction-categories-section";
import type { MedicalRecordsTransactionCategory } from "@/lib/constants/departments";
import { METRIC_CATEGORIES, type MetricCategory } from "@/lib/constants/metrics";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import type { MetricsInputFormProps, Subdepartment } from "./types";
import { toToday } from "./types";

type CategoryCard = {
  category: MetricCategory;
  title: string;
  description: string;
};

const CATEGORY_CARDS: CategoryCard[] = [
  {
    category: "revenue",
    title: "Revenue",
    description: "Revenue totals, payer counts, and pharmacy splits when applicable.",
  },
  {
    category: "census",
    title: "Census",
    description: "Daily census totals and the related breakdowns.",
  },
  {
    category: "operations",
    title: "Operations",
    description: "Operational counts, equipment utilization, transaction categories, and notes.",
  },
];

function getCategoryMeta(category: MetricCategory): CategoryCard {
  return CATEGORY_CARDS.find((item) => item.category === category) ?? CATEGORY_CARDS[0];
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
  const [activeCategory, setActiveCategory] = useState<MetricCategory>("operations");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [revenueTotal, setRevenueTotal] = useState("0");
  const [selfPayCount, setSelfPayCount] = useState("0");
  const [hmoCount, setHmoCount] = useState("0");
  const [guaranteeLetterCount, setGuaranteeLetterCount] = useState("0");
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
  const [selectedCategories, setSelectedCategories] = useState<Set<MedicalRecordsTransactionCategory>>(
    new Set<MedicalRecordsTransactionCategory>(),
  );
  const [categoryCounts, setCategoryCounts] = useState<
    ReadonlyMap<MedicalRecordsTransactionCategory, string>
  >(new Map<MedicalRecordsTransactionCategory, string>());
  const [subdepartments, setSubdepartments] = useState<Subdepartment[]>([]);
  const [, setSubdeptLoading] = useState(false);
  const [subdeptError, setSubdeptError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedDepartment = useMemo(
    () => availableDepartments.find((item) => item.id === departmentId) ?? null,
    [availableDepartments, departmentId],
  );
  const capabilities = getDepartmentCapabilities(selectedDepartment);

  const availableCategories = useMemo(
    () =>
      METRIC_CATEGORIES.filter((category) => {
        if (category === "revenue") {
          return capabilities.supportsRevenue;
        }

        if (category === "census") {
          return capabilities.supportsCensus;
        }

        return true;
      }),
    [capabilities.supportsCensus, capabilities.supportsRevenue],
  );
  const activeCategoryMeta = useMemo(() => getCategoryMeta(activeCategory), [activeCategory]);

  useEffect(() => {
    if (!availableCategories.includes(activeCategory)) {
      setActiveCategory(availableCategories[0] ?? "operations");
    }
  }, [activeCategory, availableCategories]);

  useEffect(() => {
    if (!departmentId) {
      setSubdepartments([]);
      return;
    }

    async function loadSubdepartments() {
      setSubdeptLoading(true);
      setSubdeptError(null);
      try {
        const response = await fetch(`/api/subdepartments?department_id=${departmentId}&limit=200`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          setSubdepartments([]);
          setSubdeptError("Failed to load subdepartments.");
          return;
        }
        const payload = (await response.json()) as { data: Subdepartment[] };
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

  function toggleTransactionCategory(category: MedicalRecordsTransactionCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function setTransactionCount(category: MedicalRecordsTransactionCategory, value: string) {
    setCategoryCounts((prev) => {
      const next = new Map(prev);
      next.set(category, value);
      return next;
    });
  }

  function getTransactionCount(category: MedicalRecordsTransactionCategory) {
    return categoryCounts.get(category) ?? "0";
  }

  function openCategoryModal(category: MetricCategory) {
    setActiveCategory(category);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  async function handleSubmitCategory() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        category: activeCategory,
        metric_date: metricDate,
        department_id: departmentId,
        subdepartment_id: subdepartmentId || null,
      };

      if (activeCategory === "revenue") {
        payload.revenue = {
          revenue_total: Number(revenueTotal || 0),
          self_pay_count: Number(selfPayCount || 0),
          hmo_count: Number(hmoCount || 0),
          guarantee_letter_count: Number(guaranteeLetterCount || 0),
          ...(capabilities.showsPharmacyRevenueSplit
            ? {
                pharmacy_revenue_inpatient:
                  pharmacyRevenueInpatient === "" ? null : Number(pharmacyRevenueInpatient),
                pharmacy_revenue_opd:
                  pharmacyRevenueOpd === "" ? null : Number(pharmacyRevenueOpd),
              }
            : {}),
        };
      }

      if (activeCategory === "census") {
        payload.census = {
          census_total: Number(censusTotal || 0),
          census_opd: Number(censusOpd || 0),
          census_er: Number(censusEr || 0),
          census_walk_in: censusWalkIn === "" ? null : Number(censusWalkIn),
          census_inpatient: censusInpatient === "" ? null : Number(censusInpatient),
        };
      }

      if (activeCategory === "operations") {
        payload.operations = {
          monthly_input_count: Number(monthlyInputCount || 0),
          ...(capabilities.supportsEquipment
            ? { equipment_utilization_pct: Number(equipmentUtilizationPct || 0) }
            : {}),
          ...(capabilities.tracksMedicationErrors
            ? { medication_error_count: Number(medicationErrorCount || 0) }
            : {}),
          notes: notes.trim() ? notes.trim() : null,
          ...(capabilities.usesTransactionCategories
            ? {
                transaction_entries: Array.from(selectedCategories).map((category) => ({
                  category,
                  count: Number(getTransactionCount(category) || 0),
                })),
              }
            : {}),
        };
      }

      const response = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = (await response.json().catch(() => null)) as {
          error?: string;
          details?: Record<string, string[]>;
        } | null;
        if (payloadError?.details) {
          const firstDetail = Object.values(payloadError.details)[0]?.[0];
          setError(firstDetail ?? payloadError.error ?? "Failed to submit metrics.");
        } else {
          setError(payloadError?.error ?? "Failed to submit metrics.");
        }
        return;
      }

      setMessage(`${activeCategoryMeta.title} metrics saved successfully.`);
      setIsModalOpen(false);
      if (redirectOnSave) {
        router.push(redirectOnSave, { scroll: true });
        return;
      }
      if (onSaved) await onSaved();
    } catch {
      setError("Failed to submit metrics.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-6 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
        <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Record details
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Date</label>
            <DatePicker value={metricDate} onChange={setMetricDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Department</label>
            <Select
              value={departmentId}
              onChange={(value) => {
                setDepartmentId(value);
                setSubdepartmentId("");
                setSelectedCategories(new Set<MedicalRecordsTransactionCategory>());
                setCategoryCounts(new Map<MedicalRecordsTransactionCategory, string>());
              }}
              disabled={role === "department_head"}
              options={availableDepartments.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="Select department"
            />
          </div>
          {subdepartments.length > 0 ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Subdepartment</label>
              <Select
                value={subdepartmentId}
                onChange={setSubdepartmentId}
                options={[
                  { value: "", label: "Department total" },
                  ...subdepartments.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
              {subdeptError ? <p className="mt-1 text-xs text-red-600">{subdeptError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-6 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Category-based encoding
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
              Submit one category at a time
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Each submission updates only the selected category for the chosen date, department, and subdepartment.
            </p>
          </div>
          <a
            href="/metrics/history"
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Open correction history
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableCategories.map((category) => {
            const categoryCard = getCategoryMeta(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => openCategoryModal(category)}
                className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-5 text-left shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)] transition-all hover:border-blue-200 hover:bg-blue-50/55"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {categoryCard.title}
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{categoryCard.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{categoryCard.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-blue-100/80 bg-blue-50/55 p-5 text-sm leading-7 text-slate-600 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
        Use this launcher when only one slice of the day is ready. Revenue, Census, and Operations
        can be encoded separately and corrected later from the history workspace.
      </div>

      <div className="flex items-center justify-between pt-1">
        <div>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Encode ${activeCategoryMeta.title}`}
      >
        <div className="space-y-4">
          {activeCategory === "revenue" ? (
            <>
              <input
                type="number"
                min="0"
                value={revenueTotal}
                onChange={(event) => setRevenueTotal(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="Revenue total (PHP)"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="number"
                  min="0"
                  value={selfPayCount}
                  onChange={(event) => setSelfPayCount(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Self-pay count"
                />
                <input
                  type="number"
                  min="0"
                  value={hmoCount}
                  onChange={(event) => setHmoCount(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="HMO count"
                />
                <input
                  type="number"
                  min="0"
                  value={guaranteeLetterCount}
                  onChange={(event) => setGuaranteeLetterCount(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Guarantee letter count"
                />
              </div>
              {capabilities.showsPharmacyRevenueSplit ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="number"
                    min="0"
                    value={pharmacyRevenueInpatient}
                    onChange={(event) => setPharmacyRevenueInpatient(event.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Pharmacy revenue - inpatient"
                  />
                  <input
                    type="number"
                    min="0"
                    value={pharmacyRevenueOpd}
                    onChange={(event) => setPharmacyRevenueOpd(event.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Pharmacy revenue - OPD"
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {activeCategory === "census" ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="number"
                  min="0"
                  value={censusTotal}
                  onChange={(event) => setCensusTotal(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Total census"
                />
                <input
                  type="number"
                  min="0"
                  value={censusOpd}
                  onChange={(event) => setCensusOpd(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="OPD"
                />
                <input
                  type="number"
                  min="0"
                  value={censusEr}
                  onChange={(event) => setCensusEr(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="ER"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  value={censusWalkIn}
                  onChange={(event) => setCensusWalkIn(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Walk-in"
                />
                <input
                  type="number"
                  min="0"
                  value={censusInpatient}
                  onChange={(event) => setCensusInpatient(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Inpatient"
                />
              </div>
            </>
          ) : null}

          {activeCategory === "operations" ? (
            <>
              <input
                type="number"
                min="0"
                value={monthlyInputCount}
                onChange={(event) => setMonthlyInputCount(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="Daily operational count"
              />
              {capabilities.supportsEquipment ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={equipmentUtilizationPct}
                  onChange={(event) => setEquipmentUtilizationPct(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Equipment utilization (%)"
                />
              ) : null}
              {capabilities.tracksMedicationErrors ? (
                <input
                  type="number"
                  min="0"
                  value={medicationErrorCount}
                  onChange={(event) => setMedicationErrorCount(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Medication error count"
                />
              ) : null}
              {capabilities.usesTransactionCategories ? (
                <TransactionCategoriesSection
                  selectedCategories={selectedCategories}
                  categoryCounts={categoryCounts}
                  onToggle={toggleTransactionCategory}
                  onCountChange={setTransactionCount}
                />
              ) : null}
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                placeholder="Notes or correction context"
              />
            </>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleSubmitCategory()}
              disabled={submitting || !departmentId}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving..." : `Save ${activeCategoryMeta.title}`}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
