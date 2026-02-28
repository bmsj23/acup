"use client";

type RevenueSectionProps = {
  revenueTotal: string;
  pharmacyRevenueInpatient: string;
  pharmacyRevenueOpd: string;
  showPharmacyFields: boolean;
  onRevenueTotalChange: (value: string) => void;
  onPharmacyInpatientChange: (value: string) => void;
  onPharmacyOpdChange: (value: string) => void;
};

export default function RevenueSection({
  revenueTotal,
  pharmacyRevenueInpatient,
  pharmacyRevenueOpd,
  showPharmacyFields,
  onRevenueTotalChange,
  onPharmacyInpatientChange,
  onPharmacyOpdChange,
}: RevenueSectionProps) {
  return (
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
            onChange={(event) => onRevenueTotalChange(event.target.value)}
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
                onChange={(event) => onPharmacyInpatientChange(event.target.value)}
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
                onChange={(event) => onPharmacyOpdChange(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}