"use client";

type DashboardPrintHeaderProps = {
  monthLabel: string;
  departmentLabel: string;
  dataAsOf: string | null;
};

export default function DashboardPrintHeader({
  monthLabel,
  departmentLabel,
  dataAsOf,
}: DashboardPrintHeaderProps) {
  return (
    <section className="hidden rounded-2xl border border-zinc-200 bg-white p-5 print:block">
      <div className="flex items-start justify-between gap-6 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Operational report
          </p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">
            Operations Dashboard
          </h1>
        </div>
        <div className="text-right text-xs leading-6 text-zinc-500">
          <p>{monthLabel}</p>
          <p>{departmentLabel}</p>
          {dataAsOf ? <p>Data as of {dataAsOf}</p> : null}
        </div>
      </div>
    </section>
  );
}
