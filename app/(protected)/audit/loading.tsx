export default function AuditLoading() {
  return (
    <div className="w-full space-y-6">
      {/* header skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-zinc-200" />
          <div className="h-4 w-72 rounded-md bg-zinc-100" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-zinc-200" />
      </div>

      {/* filter bar skeleton */}
      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-36 rounded-xl bg-zinc-200" />
        <div className="h-10 w-36 rounded-xl bg-zinc-200" />
        <div className="h-10 w-40 rounded-xl bg-zinc-200" />
        <div className="h-10 w-44 rounded-xl bg-zinc-200" />
        <div className="h-10 w-56 rounded-xl bg-zinc-200" />
      </div>

      {/* table skeleton */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          {["w-32", "w-24", "w-20", "w-28", "w-24", "w-28"].map((w, i) => (
            <div key={i} className={`h-3.5 ${w} rounded bg-zinc-200`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5">
            <div className="h-4 w-36 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-5 w-16 rounded-full bg-zinc-100" />
            <div className="h-4 w-28 rounded bg-zinc-100" />
            <div className="h-4 w-20 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}