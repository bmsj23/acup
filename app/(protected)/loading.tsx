export default function ProtectedLoading() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      {/* filter bar skeleton */}
      <section className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="h-11 w-80 rounded-xl border border-zinc-200 bg-zinc-100" />
        <div className="flex items-center gap-3">
          <div className="h-11 w-20 rounded-xl border border-zinc-200 bg-zinc-100" />
          <div className="h-11 w-28 rounded-xl border border-zinc-200 bg-zinc-100" />
        </div>
      </section>
      {/* stat cards skeleton */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-36 rounded-2xl bg-[#002366]/10" />
        <div className="h-36 rounded-2xl border border-zinc-200 bg-zinc-50" />
        <div className="h-36 rounded-2xl border border-zinc-200 bg-zinc-50" />
        <div className="h-36 rounded-2xl border border-zinc-200 bg-zinc-50" />
      </section>
      {/* charts skeleton */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 rounded-2xl border border-zinc-200 bg-zinc-50" />
        <div className="h-96 rounded-2xl border border-zinc-200 bg-zinc-50" />
      </section>
      {/* recent entries skeleton */}
      <div className="h-72 rounded-2xl border border-zinc-200 bg-zinc-50" />
    </div>
  );
}
