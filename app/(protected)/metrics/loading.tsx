export default function MetricsLoading() {
  return (
    <div className="w-full space-y-6">
      {/* header skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-md bg-zinc-100" />
          <div className="h-7 w-44 rounded-lg bg-zinc-200" />
          <div className="h-4 w-72 rounded-md bg-zinc-100" />
        </div>
      </div>

      {/* month selector + department filter skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="h-10 w-48 rounded-xl bg-zinc-200" />
        <div className="h-10 w-44 rounded-xl bg-zinc-200" />
      </div>

      {/* table skeleton */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex gap-8">
            <div className="h-3 w-16 rounded bg-zinc-200" />
            <div className="h-3 w-24 rounded bg-zinc-200" />
            <div className="h-3 w-20 rounded bg-zinc-200" />
            <div className="h-3 w-16 rounded bg-zinc-200" />
            <div className="h-3 w-16 rounded bg-zinc-200" />
            <div className="h-3 w-16 rounded bg-zinc-200" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-zinc-100 px-4 py-4 last:border-b-0">
            <div className="h-4 w-20 rounded bg-zinc-100" />
            <div className="h-4 w-28 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="h-4 w-16 rounded bg-zinc-100" />
            <div className="h-4 w-14 rounded bg-zinc-100" />
            <div className="h-4 w-20 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}