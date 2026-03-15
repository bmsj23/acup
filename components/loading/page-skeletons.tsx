"use client";

import SkeletonBlock from "@/components/loading/skeleton-block";
import WorkspacePanel from "@/components/workspace/workspace-panel";

type WorkspaceModuleSkeletonProps = {
  statCount?: number;
  leftPanelCount?: number;
  rowCount?: number;
};

function SoftPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] shadow-[0_24px_60px_-42px_rgba(30,64,175,0.14)] ${
        className ?? ""
      }`.trim()}
    >
      {children}
    </div>
  );
}

function ToolbarButtonSkeleton({
  widthClassName,
  delayMs,
}: {
  widthClassName: string;
  delayMs?: number;
}) {
  return <SkeletonBlock className={`h-11 ${widthClassName} rounded-xl`} delayMs={delayMs} />;
}

export function DashboardPageSkeleton() {
  return (
    <div className="w-full space-y-8">
      <section className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <SoftPanel className="flex flex-wrap items-center gap-2 p-1">
            <SkeletonBlock className="h-10 w-10 rounded-lg" />
            <SkeletonBlock className="h-10 w-32 rounded-xl" delayMs={80} />
            <SkeletonBlock className="h-10 w-44 rounded-xl" delayMs={140} />
          </SoftPanel>
          <SoftPanel className="flex items-center gap-1 p-1">
            <SkeletonBlock className="h-8 flex-1 rounded-md" delayMs={120} />
            <SkeletonBlock className="h-8 flex-1 rounded-md" delayMs={180} />
          </SoftPanel>
          <SkeletonBlock className="h-4 w-52 rounded-full" delayMs={220} />
        </div>

        <div className="flex items-center gap-3">
          <ToolbarButtonSkeleton widthClassName="w-24" />
          <ToolbarButtonSkeleton widthClassName="w-32" delayMs={70} />
          <ToolbarButtonSkeleton widthClassName="w-36" delayMs={130} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-[#002366] p-6 shadow-[0_22px_50px_-38px_rgba(0,35,102,0.45)]">
          <SkeletonBlock className="h-4 w-28 rounded-full bg-white/18" />
          <SkeletonBlock className="mt-4 h-8 w-32 rounded-full bg-white/22" delayMs={80} />
          <SkeletonBlock className="mt-6 h-4 w-24 rounded-full bg-white/14" delayMs={140} />
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <SoftPanel key={index} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-28 rounded-full" delayMs={index * 60} />
                <SkeletonBlock className="h-8 w-24 rounded-full" delayMs={index * 60 + 80} />
              </div>
              <SkeletonBlock className="h-11 w-11 rounded-2xl" delayMs={index * 60 + 140} />
            </div>
            <SkeletonBlock className="mt-6 h-6 w-40 rounded-full" delayMs={index * 60 + 200} />
          </SoftPanel>
        ))}
      </section>

      <section className="space-y-4">
        <SkeletonBlock className="h-3 w-40 rounded-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SoftPanel key={index} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <SkeletonBlock className="h-5 w-28 rounded-full" delayMs={index * 70} />
                  <SkeletonBlock className="h-4 w-40 rounded-full" delayMs={index * 70 + 80} />
                  <SkeletonBlock className="h-4 w-32 rounded-full" delayMs={index * 70 + 150} />
                </div>
                <SkeletonBlock className="h-11 w-11 rounded-2xl" delayMs={index * 70 + 210} />
              </div>
              <SkeletonBlock className="mt-8 h-4 w-28 rounded-full" delayMs={index * 70 + 260} />
            </SoftPanel>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <SoftPanel key={index} className="p-5">
            <SkeletonBlock className="h-3 w-24 rounded-full" delayMs={index * 90} />
            <SkeletonBlock className="mt-4 h-7 w-56 rounded-full" delayMs={index * 90 + 80} />
            <SkeletonBlock className="mt-3 h-4 w-72 rounded-full" delayMs={index * 90 + 150} />
            <SkeletonBlock className="mt-8 h-80 w-full rounded-[1.5rem]" delayMs={index * 90 + 220} />
          </SoftPanel>
        ))}
      </section>

      <SoftPanel className="p-5">
        <SkeletonBlock className="h-3 w-28 rounded-full" />
        <SkeletonBlock className="mt-4 h-7 w-48 rounded-full" delayMs={80} />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className="h-14 w-full rounded-[1.2rem]"
              delayMs={index * 70 + 140}
            />
          ))}
        </div>
      </SoftPanel>
    </div>
  );
}

export function WorkspaceModuleSkeleton({
  statCount = 4,
  leftPanelCount = 1,
  rowCount = 4,
}: WorkspaceModuleSkeletonProps) {
  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <WorkspacePanel className="relative overflow-hidden px-6 py-7 md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3.5">
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="h-11 w-[min(100%,27rem)] rounded-[1.15rem]" delayMs={70} />
            <SkeletonBlock className="h-4 w-full max-w-[31rem] rounded-full" delayMs={120} />
            <SkeletonBlock className="h-4 w-[82%] max-w-[24rem] rounded-full" delayMs={180} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SoftPanel className="p-2">
              <SkeletonBlock className="h-10 w-28 rounded-xl" />
            </SoftPanel>
            <SoftPanel className="p-2">
              <SkeletonBlock className="h-10 w-40 rounded-xl" delayMs={80} />
            </SoftPanel>
          </div>
        </div>
      </WorkspacePanel>

      <section className={`grid gap-4 ${statCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {Array.from({ length: statCount }).map((_, index) => (
          <SoftPanel key={index} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2.5">
                <SkeletonBlock className="h-4 w-24 rounded-full" delayMs={index * 70} />
                <SkeletonBlock className="h-7 w-20 rounded-full" delayMs={index * 70 + 80} />
              </div>
              <SkeletonBlock className="h-10 w-10 rounded-2xl" delayMs={index * 70 + 140} />
            </div>
            <SkeletonBlock className="mt-5 h-5 w-28 rounded-full" delayMs={index * 70 + 210} />
          </SoftPanel>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <SoftPanel key={index} className="p-5">
            <SkeletonBlock className="h-3 w-24 rounded-full" delayMs={index * 90} />
            <SkeletonBlock className="mt-4 h-6 w-44 rounded-full" delayMs={index * 90 + 70} />
            <SkeletonBlock className="mt-3 h-4 w-[78%] max-w-[15rem] rounded-full" delayMs={index * 90 + 140} />
            <SkeletonBlock className="mt-7 h-72 w-full rounded-[1.45rem]" delayMs={index * 90 + 210} />
          </SoftPanel>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="space-y-6">
          {Array.from({ length: leftPanelCount }).map((_, index) => (
            <SoftPanel key={index} className="p-5">
              <SkeletonBlock className="h-3 w-28 rounded-full" delayMs={index * 90} />
              <SkeletonBlock className="mt-4 h-6 w-40 rounded-full" delayMs={index * 90 + 70} />
              <div className="mt-5 space-y-3.5">
                {Array.from({ length: 4 }).map((__, fieldIndex) => (
                  <SkeletonBlock
                    key={fieldIndex}
                    className="h-11 w-[94%] rounded-xl"
                    delayMs={index * 90 + fieldIndex * 70 + 140}
                  />
                ))}
                <div className="flex gap-3 pt-2">
                  <SkeletonBlock className="h-10 w-24 rounded-full" delayMs={index * 90 + 420} />
                  <SkeletonBlock className="h-10 w-20 rounded-full" delayMs={index * 90 + 500} />
                </div>
              </div>
            </SoftPanel>
          ))}
        </div>

        <SoftPanel className="p-5">
          <SkeletonBlock className="h-3 w-24 rounded-full" />
          <SkeletonBlock className="mt-4 h-6 w-44 rounded-full" delayMs={80} />
          <div className="mt-6 space-y-3">
            {Array.from({ length: rowCount }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-[1.2rem] border border-blue-100/70 bg-white/85 p-4 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]"
              >
                <SkeletonBlock className="h-4 w-[92%] rounded-full" delayMs={index * 60 + 120} />
                <SkeletonBlock className="h-4 w-24 rounded-full" delayMs={index * 60 + 190} />
                <SkeletonBlock className="h-4 w-20 rounded-full" delayMs={index * 60 + 260} />
                <SkeletonBlock className="h-4 w-28 rounded-full" delayMs={index * 60 + 330} />
              </div>
            ))}
          </div>
        </SoftPanel>
      </section>
    </div>
  );
}

export function AnnouncementsPageSkeleton() {
  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <WorkspacePanel className="overflow-hidden">
        <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.25fr)_24rem] xl:items-start">
          <div>
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="mt-4 h-14 w-[min(100%,30rem)] rounded-[1.25rem]" delayMs={80} />
            <SkeletonBlock className="mt-4 h-4 w-full max-w-[40rem] rounded-full" delayMs={140} />
            <SkeletonBlock className="mt-2 h-4 w-3/4 rounded-full" delayMs={200} />

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SoftPanel key={index} className="p-4">
                  <SkeletonBlock className="h-3 w-24 rounded-full" delayMs={index * 70} />
                  <SkeletonBlock className="mt-4 h-8 w-16 rounded-full" delayMs={index * 70 + 80} />
                  <SkeletonBlock className="mt-3 h-4 w-32 rounded-full" delayMs={index * 70 + 140} />
                </SoftPanel>
              ))}
            </div>
          </div>

          <SoftPanel className="p-5">
            <SkeletonBlock className="h-3 w-28 rounded-full" />
            <SkeletonBlock className="mt-4 h-8 w-40 rounded-full" delayMs={80} />
            <SkeletonBlock className="mt-4 h-4 w-full rounded-full" delayMs={140} />
            <SkeletonBlock className="mt-2 h-4 w-4/5 rounded-full" delayMs={200} />
            <SkeletonBlock className="mt-8 h-12 w-full rounded-full" delayMs={260} />
            <SkeletonBlock className="mt-3 h-11 w-full rounded-full" delayMs={320} />
            <SoftPanel className="mt-5 p-4">
              <SkeletonBlock className="h-3 w-20 rounded-full" delayMs={380} />
              <SkeletonBlock className="mt-4 h-4 w-40 rounded-full" delayMs={440} />
            </SoftPanel>
          </SoftPanel>
        </div>
      </WorkspacePanel>

      <SoftPanel className="p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_13rem] md:items-end">
          <SkeletonBlock className="h-12 w-full rounded-[1.2rem]" />
          <SkeletonBlock className="h-12 w-full rounded-[1.2rem]" delayMs={80} />
          <SkeletonBlock className="h-12 w-full rounded-[1.2rem]" delayMs={150} />
        </div>
      </SoftPanel>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SoftPanel key={index} className="p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SkeletonBlock className="h-7 w-24 rounded-full" delayMs={index * 70} />
                  <SkeletonBlock className="h-7 w-28 rounded-full" delayMs={index * 70 + 60} />
                  <SkeletonBlock className="h-7 w-32 rounded-full" delayMs={index * 70 + 120} />
                </div>
                <SkeletonBlock className="mt-5 h-4 w-32 rounded-full" delayMs={index * 70 + 180} />
                <SkeletonBlock className="mt-3 h-7 w-2/3 rounded-full" delayMs={index * 70 + 240} />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((__, cardIndex) => (
                    <SkeletonBlock
                      key={cardIndex}
                      className="h-20 w-full rounded-[1.2rem]"
                      delayMs={index * 70 + cardIndex * 70 + 300}
                    />
                  ))}
                </div>
              </div>
              <div className="flex w-full max-w-48 flex-col gap-3 lg:items-end">
                <SkeletonBlock className="h-4 w-28 rounded-full" delayMs={index * 70 + 420} />
                <SkeletonBlock className="h-4 w-24 rounded-full" delayMs={index * 70 + 470} />
              </div>
            </div>
          </SoftPanel>
        ))}
      </div>
    </div>
  );
}

export function IncidentsPageSkeleton() {
  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <WorkspacePanel className="overflow-hidden">
        <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.25fr)_24rem] xl:items-start">
          <div>
            <SkeletonBlock className="h-3 w-40 rounded-full" />
            <SkeletonBlock className="mt-4 h-14 w-[min(100%,30rem)] rounded-[1.25rem]" delayMs={80} />
            <SkeletonBlock className="mt-4 h-4 w-full max-w-[42rem] rounded-full" delayMs={140} />
            <SkeletonBlock className="mt-2 h-4 w-3/4 rounded-full" delayMs={200} />

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SoftPanel key={index} className="p-4">
                  <SkeletonBlock className="h-3 w-24 rounded-full" delayMs={index * 70} />
                  <SkeletonBlock className="mt-4 h-8 w-28 rounded-full" delayMs={index * 70 + 70} />
                  <SkeletonBlock className="mt-3 h-4 w-32 rounded-full" delayMs={index * 70 + 140} />
                </SoftPanel>
              ))}
            </div>
          </div>

          <SoftPanel className="p-5">
            <SkeletonBlock className="h-3 w-28 rounded-full" />
            <SkeletonBlock className="mt-4 h-8 w-40 rounded-full" delayMs={70} />
            <SkeletonBlock className="mt-4 h-4 w-full rounded-full" delayMs={140} />
            <SkeletonBlock className="mt-2 h-4 w-4/5 rounded-full" delayMs={200} />
            <SkeletonBlock className="mt-8 h-12 w-full rounded-full" delayMs={260} />
            <SoftPanel className="mt-5 p-4">
              <SkeletonBlock className="h-3 w-24 rounded-full" delayMs={320} />
              <SkeletonBlock className="mt-4 h-4 w-48 rounded-full" delayMs={380} />
            </SoftPanel>
          </SoftPanel>
        </div>
      </WorkspacePanel>

      <SoftPanel className="p-5">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-10 w-28 rounded-full" />
            <SkeletonBlock className="h-10 w-28 rounded-full" delayMs={60} />
            <SkeletonBlock className="h-10 w-28 rounded-full" delayMs={120} />
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_12rem] md:items-end">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className="h-12 w-full rounded-[1.2rem]"
                delayMs={index * 80 + 180}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-11 w-36 rounded-xl" delayMs={260} />
            <SkeletonBlock className="h-11 w-44 rounded-full" delayMs={320} />
          </div>
        </div>
      </SoftPanel>

      <WorkspacePanel className="p-5">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className="h-32 w-full rounded-[1.8rem]"
              delayMs={index * 70}
            />
          ))}
        </div>
      </WorkspacePanel>
    </div>
  );
}

export function AuditLogsSkeleton() {
  return (
    <div className="w-full space-y-6">
      <WorkspacePanel className="overflow-hidden">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.35),transparent_70%)] blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <SkeletonBlock className="h-3 w-44 rounded-full" />
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-11 w-11 rounded-full" delayMs={70} />
                <div className="space-y-3">
                  <SkeletonBlock className="h-11 w-[min(100%,22rem)] rounded-[1.2rem]" delayMs={120} />
                  <SkeletonBlock className="h-4 w-full max-w-[28rem] rounded-full" delayMs={180} />
                  <SkeletonBlock className="h-4 w-4/5 rounded-full" delayMs={240} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-36 rounded-full" delayMs={140} />
              <SkeletonBlock className="h-11 w-32 rounded-full" delayMs={210} />
            </div>
          </div>
        </div>
      </WorkspacePanel>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <WorkspacePanel key={index} className="p-5">
            <SkeletonBlock className="h-3 w-28 rounded-full" delayMs={index * 70} />
            <SkeletonBlock className="mt-4 h-8 w-20 rounded-full" delayMs={index * 70 + 70} />
            <SkeletonBlock className="mt-3 h-4 w-48 rounded-full" delayMs={index * 70 + 140} />
          </WorkspacePanel>
        ))}
      </section>

      <SoftPanel className="p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_240px_minmax(0,1.2fr)_auto]">
          {["w-full", "w-full", "w-full", "w-full", "w-full", "w-full"].map((width, index) => (
            <SkeletonBlock
              key={`${width}-${index}`}
              className={`h-12 ${width} rounded-[1rem]`}
              delayMs={index * 70}
            />
          ))}
        </div>
      </SoftPanel>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <WorkspacePanel key={index} className="overflow-hidden">
            <div className="px-5 py-5 md:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <SkeletonBlock className="h-7 w-24 rounded-full" delayMs={index * 70} />
                    <SkeletonBlock className="h-7 w-36 rounded-full" delayMs={index * 70 + 70} />
                    <SkeletonBlock className="h-7 w-28 rounded-full" delayMs={index * 70 + 140} />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)_minmax(180px,0.9fr)]">
                    <div className="space-y-3">
                      <SkeletonBlock className="h-3 w-16 rounded-full" delayMs={index * 70 + 200} />
                      <SkeletonBlock className="h-6 w-44 rounded-full" delayMs={index * 70 + 260} />
                      <SkeletonBlock className="h-4 w-36 rounded-full" delayMs={index * 70 + 320} />
                    </div>
                    <div className="space-y-3">
                      <SkeletonBlock className="h-3 w-20 rounded-full" delayMs={index * 70 + 230} />
                      <SkeletonBlock className="h-4 w-36 rounded-full" delayMs={index * 70 + 290} />
                    </div>
                    <div className="space-y-3">
                      <SkeletonBlock className="h-3 w-20 rounded-full" delayMs={index * 70 + 260} />
                      <SkeletonBlock className="h-4 w-32 rounded-full" delayMs={index * 70 + 320} />
                    </div>
                  </div>
                </div>
                <SkeletonBlock className="h-10 w-32 rounded-full" delayMs={index * 70 + 380} />
              </div>
            </div>
          </WorkspacePanel>
        ))}
      </div>
    </div>
  );
}

export function MetricsEntrySkeleton() {
  return (
    <div className="w-full space-y-6">
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-44 rounded-full" delayMs={70} />
          <SkeletonBlock className="h-4 w-72 rounded-full" delayMs={140} />
        </div>
        <SkeletonBlock className="h-11 w-11 rounded-xl" delayMs={220} />
      </section>

      {Array.from({ length: 5 }).map((_, index) => (
        <SoftPanel key={index} className="p-6">
          <SkeletonBlock className="h-3 w-28 rounded-full" delayMs={index * 80} />
          <div className={`mt-5 grid gap-4 ${index === 0 ? "md:grid-cols-3" : index === 3 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
            {Array.from({ length: index === 0 ? 3 : index === 3 ? 2 : 1 }).map((__, fieldIndex) => (
              <div key={fieldIndex} className="space-y-2">
                <SkeletonBlock className="h-3 w-24 rounded-full" delayMs={index * 80 + fieldIndex * 70 + 70} />
                <SkeletonBlock className="h-11 w-full rounded-xl" delayMs={index * 80 + fieldIndex * 70 + 130} />
              </div>
            ))}
          </div>
        </SoftPanel>
      ))}

      <div className="flex items-center justify-between pt-2">
        <SkeletonBlock className="h-4 w-44 rounded-full" />
        <SkeletonBlock className="h-11 w-36 rounded-lg" delayMs={80} />
      </div>
    </div>
  );
}

export function MetricsHistorySkeleton() {
  return (
    <div className="w-full space-y-6">
      <section className="space-y-3">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="h-8 w-44 rounded-full" delayMs={70} />
        <SkeletonBlock className="h-4 w-72 rounded-full" delayMs={140} />
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <SkeletonBlock className="h-11 w-40 rounded-xl" />
        <SkeletonBlock className="h-11 w-52 rounded-xl" delayMs={80} />
      </div>

      <SoftPanel className="overflow-hidden">
        <div className="border-b border-zinc-100 bg-white/60 px-5 py-4">
          <div className="flex gap-6">
            {["w-16", "w-24", "w-20", "w-20", "w-16", "w-20"].map((width, index) => (
              <SkeletonBlock
                key={width}
                className={`h-3 ${width} rounded-full`}
                delayMs={index * 70}
              />
            ))}
          </div>
        </div>
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid gap-4 border-b border-zinc-100 px-5 py-4 md:grid-cols-[0.8fr_1.1fr_0.9fr_0.8fr_0.7fr_1fr]"
            >
              {Array.from({ length: 6 }).map((__, cellIndex) => (
                <SkeletonBlock
                  key={cellIndex}
                  className={`h-4 ${cellIndex === 5 ? "w-28" : "w-full"} rounded-full`}
                  delayMs={index * 60 + cellIndex * 50}
                />
              ))}
            </div>
          ))}
        </div>
      </SoftPanel>
    </div>
  );
}

export function DefaultProtectedSkeleton() {
  return (
    <div className="w-full space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-52 rounded-full" />
          <SkeletonBlock className="h-4 w-72 rounded-full" delayMs={70} />
        </div>
        <SkeletonBlock className="h-11 w-36 rounded-xl" delayMs={140} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SoftPanel className="p-5">
          <SkeletonBlock className="h-12 w-full rounded-[1.2rem]" />
          <SkeletonBlock className="mt-6 h-72 w-full rounded-[1.5rem]" delayMs={80} />
        </SoftPanel>
        <SoftPanel className="p-5">
          <SkeletonBlock className="h-12 w-3/4 rounded-[1.2rem]" delayMs={120} />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className="h-16 w-full rounded-[1.2rem]"
                delayMs={index * 70 + 180}
              />
            ))}
          </div>
        </SoftPanel>
      </section>
    </div>
  );
}
