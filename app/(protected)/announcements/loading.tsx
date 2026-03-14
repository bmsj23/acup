export default function AnnouncementsLoading() {
  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <section className="animate-pulse overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] px-6 py-7 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.18)] md:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_24rem] xl:items-start">
          <div>
            <div className="h-4 w-40 rounded-full bg-slate-100" />
            <div className="mt-4 h-12 w-80 rounded-[1rem] bg-blue-100/75" />
            <div className="mt-4 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-slate-100" />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 rounded-[1.4rem] bg-white/90 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]" />
              ))}
            </div>
          </div>
          <div className="h-72 rounded-[1.8rem] bg-white/90 shadow-[0_24px_60px_-40px_rgba(30,64,175,0.16)]" />
        </div>
      </section>

      <section className="animate-pulse rounded-[1.9rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_13rem]">
          <div className="h-12 rounded-[1.2rem] bg-white/90" />
          <div className="h-12 rounded-[1.2rem] bg-white/90" />
          <div className="h-12 rounded-[1.2rem] bg-white/90" />
        </div>
      </section>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-[1.8rem] border border-blue-100/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.16)]"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex gap-2">
                  <div className="h-7 w-24 rounded-full bg-blue-100/85" />
                  <div className="h-7 w-28 rounded-full bg-blue-50" />
                </div>
                <div className="mt-4 h-6 w-2/3 rounded-full bg-blue-100/80" />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((__, cardIndex) => (
                    <div key={cardIndex} className="h-24 rounded-[1.2rem] bg-blue-50/60" />
                  ))}
                </div>
              </div>
              <div className="h-4 w-28 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
