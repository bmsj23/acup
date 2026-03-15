"use client";

import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Copy, ExternalLink, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import Select from "@/components/ui/select";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";
import type { UserRole } from "@/types/database";
import type { MonitoringDepartment, TrainingModuleItem } from "@/types/monitoring";

type TrainingModulesClientProps = {
  role: UserRole;
  defaultDepartmentId: string | null;
  availableDepartments: MonitoringDepartment[];
};

function buildModulesQueryString(
  departmentId: string,
  search: string,
) {
  const params = new URLSearchParams();
  params.set("limit", "200");
  if (departmentId) {
    params.set("department_id", departmentId);
  }
  if (search) {
    params.set("search", search);
  }
  return params.toString();
}

function formatPublishedLabel(value: string | null) {
  if (!value) {
    return "Draft";
  }

  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TrainingModulesClient({
  role,
  defaultDepartmentId,
  availableDepartments,
}: TrainingModulesClientProps) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchTerm.trim());
  const queryString = useMemo(
    () => buildModulesQueryString(selectedDepartmentId, deferredSearch),
    [deferredSearch, selectedDepartmentId],
  );

  const { data, isLoading, isFetching, error } = useQuery<{ data: TrainingModuleItem[] }>({
    queryKey: ["training-modules", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/training/modules?${queryString}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load training modules.");
      }
      return response.json();
    },
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const modules = useMemo(
    () => data?.data ?? [],
    [data?.data],
  );
  const resolvedSelectedModuleId =
    selectedModuleId && modules.some((module) => module.id === selectedModuleId)
      ? selectedModuleId
      : modules[0]?.id ?? null;
  const selectedModule = modules.find((module) => module.id === resolvedSelectedModuleId) ?? null;

  function buildAccessUrl(qrToken: string) {
    if (typeof window === "undefined") {
      return `/training/${qrToken}`;
    }
    return new URL(`/training/${qrToken}`, window.location.origin).toString();
  }

  async function copyAccessUrl(qrToken: string) {
    await navigator.clipboard.writeText(buildAccessUrl(qrToken));
    toast.success("Training access link copied.");
  }

  return (
    <div className="space-y-6">
      {(error && <InlineErrorBanner message={error.message} />) || null}

      <section className="rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] px-6 py-7 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.2)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Training Modules
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4.5vw,3.35rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)]">
              Module library with QR handoff
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Keep this page lean: browse the published materials, preview the scannable QR, and jump straight to the public training route when you need to verify the learner experience.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <OptimisticRouteLink
              href="/training"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Back to compliance
            </OptimisticRouteLink>
            <div className="rounded-2xl border border-white/80 bg-white/85 p-2 shadow-sm">
              <Select
                value={selectedDepartmentId}
                onChange={setSelectedDepartmentId}
                options={[
                  ...(role === "department_head" ? [] : [{ value: "", label: "All Departments" }]),
                  ...availableDepartments.map((department) => ({
                    value: department.id,
                    label: department.name,
                  })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <label className="group flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
            <Search className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-blue-700" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search module title or description"
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm">
            <span>{modules.length} module{modules.length === 1 ? "" : "s"}</span>
            {isFetching && !isLoading ? <span className="text-blue-700">Refreshing</span> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 px-5 py-10 text-center shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
              <p className="text-sm font-medium text-slate-700">No training modules found.</p>
              <p className="mt-2 text-sm text-slate-500">
                Adjust the department filter or search term to check a wider set.
              </p>
            </div>
          ) : null}

          {modules.map((module) => {
            const isSelected = module.id === selectedModule?.id;
            const isPublished = Boolean(module.published_at);

            return (
              <button
                key={module.id}
                type="button"
                onClick={() => setSelectedModuleId(module.id)}
                className={`w-full rounded-[1.75rem] border p-5 text-left shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)] transition-all ${
                  isSelected
                    ? "border-blue-200 bg-blue-50/65"
                    : "border-blue-100/80 bg-white/95 hover:border-blue-200 hover:bg-blue-50/40"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {module.is_system_wide ? "System-wide" : module.departments?.name ?? "Department"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isPublished
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-slate-950">{module.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {module.description}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {formatPublishedLabel(module.published_at)} - {module.material_file_name}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-52 lg:justify-end">
                    <a
                      href={`/api/training/modules/${module.id}/material`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Open material
                    </a>
                    {isPublished ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyAccessUrl(module.qr_token);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy route
                      </button>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[1.9rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              <QrCode className="h-3.5 w-3.5" />
              QR Preview
            </div>

            {selectedModule ? (
              <>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{selectedModule.title}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedModule.published_at
                    ? "Scan this code to open the public training page instantly."
                    : "Publish this module first before using the QR route."}
                </p>

                {selectedModule.published_at ? (
                  <>
                    <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-blue-100 bg-blue-50/50 p-4">
                      <Image
                        src={`/api/training/modules/${selectedModule.id}/qr`}
                        alt={`QR code for ${selectedModule.title}`}
                        className="mx-auto rounded-2xl bg-white p-3 shadow-sm"
                        width={224}
                        height={224}
                        unoptimized
                      />
                    </div>
                    <div className="mt-4 rounded-[1.2rem] border border-zinc-200 bg-zinc-50 p-3">
                      <p className="break-all text-xs leading-6 text-slate-600">
                        {buildAccessUrl(selectedModule.qr_token)}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <a
                        href={buildAccessUrl(selectedModule.qr_token)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open public page
                      </a>
                      <button
                        type="button"
                        onClick={() => void copyAccessUrl(selectedModule.qr_token)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <Copy className="h-4 w-4" />
                        Copy access route
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-[1.4rem] border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm leading-6 text-amber-700">
                    Draft modules keep the QR inactive until a publish date is set from the training dashboard.
                  </div>
                )}
              </>
            ) : (
              <div className="mt-5 rounded-[1.4rem] border border-dashed border-blue-100 bg-blue-50/60 px-4 py-6 text-sm text-slate-500">
                Select a module to preview its access route and QR handoff.
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
