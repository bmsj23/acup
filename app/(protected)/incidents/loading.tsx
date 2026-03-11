export default function IncidentsLoading() {
  return (
    <div className="w-full space-y-6">
      {/* header skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-zinc-200" />
          <div className="h-4 w-64 rounded-md bg-zinc-100" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-zinc-200" />
      </div>

      {/* filter bar skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="h-10 w-72 rounded-xl bg-zinc-200" />
        <div className="h-10 w-36 rounded-xl bg-zinc-200" />
        <div className="h-10 w-44 rounded-xl bg-zinc-200" />
      </div>

      {/* incident card list skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2.5 flex-1">
                <div className="h-5 w-3/5 rounded-md bg-zinc-200" />
                <div className="flex items-center gap-3">
                  <div className="h-4 w-28 rounded-md bg-zinc-100" />
                  <div className="h-4 w-24 rounded-md bg-zinc-100" />
                </div>
                <div className="h-4 w-4/5 rounded-md bg-zinc-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-zinc-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}