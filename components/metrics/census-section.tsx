"use client";

type CensusSectionProps = {
  censusTotal: string;
  censusOpd: string;
  censusEr: string;
  censusWalkIn: string;
  censusInpatient: string;
  onCensusTotalChange: (value: string) => void;
  onCensusOpdChange: (value: string) => void;
  onCensusErChange: (value: string) => void;
  onCensusWalkInChange: (value: string) => void;
  onCensusInpatientChange: (value: string) => void;
};

export default function CensusSection({
  censusTotal,
  censusOpd,
  censusEr,
  censusWalkIn,
  censusInpatient,
  onCensusTotalChange,
  onCensusOpdChange,
  onCensusErChange,
  onCensusWalkInChange,
  onCensusInpatientChange,
}: CensusSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Patient Census</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Census Total</label>
          <input
            type="number"
            min="0"
            value={censusTotal}
            onChange={(event) => onCensusTotalChange(event.target.value)}
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
            onChange={(event) => onCensusOpdChange(event.target.value)}
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
            onChange={(event) => onCensusErChange(event.target.value)}
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
            onChange={(event) => onCensusWalkInChange(event.target.value)}
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
            onChange={(event) => onCensusInpatientChange(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>
    </div>
  );
}