export default function AnnouncementsLoading() {
  return (
    <div className="w-full space-y-6">
      {/* header skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-zinc-200" />
          <div className="h-4 w-72 rounded-md bg-zinc-100" />
        </div>
        <div className="h-10 w-44 rounded-xl bg-zinc-200" />
      </div>

      {/* filter bar skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="h-10 w-72 rounded-xl bg-zinc-200" />
        <div className="h-10 w-32 rounded-xl bg-zinc-200" />
        <div className="h-10 w-36 rounded-xl bg-zinc-200" />
      </div>

      {/* announcement card list skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 rounded-full bg-zinc-200" />
                <div className="h-5 w-20 rounded-full bg-zinc-100" />
              </div>
              <div className="h-5 w-4/5 rounded-md bg-zinc-200" />
              <div className="h-4 w-full rounded-md bg-zinc-100" />
              <div className="h-4 w-2/3 rounded-md bg-zinc-100" />
              <div className="h-3 w-28 rounded-md bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}