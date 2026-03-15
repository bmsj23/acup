"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import FormField from "@/components/ui/form-field";
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
              Module library
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Browse by department, narrow the list fast, then open a detail page when you need access actions.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <OptimisticRouteLink
              href="/training"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Back to training hub
            </OptimisticRouteLink>
            <FormField label="Department" className="min-w-[18rem]">
              <Select
                value={selectedDepartmentId}
                onChange={setSelectedDepartmentId}
                className="rounded-2xl border-white/80 bg-white/90 shadow-sm"
                dropdownMinWidth={288}
                options={[
                  ...(role === "department_head" ? [] : [{ value: "", label: "All Departments" }]),
                  ...availableDepartments.map((department) => ({
                    value: department.id,
                    label: department.name,
                  })),
                ]}
              />
            </FormField>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <FormField label="Search modules">
            <label className="group flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
              <Search className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-blue-700" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search module title or description"
                className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </FormField>
          <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm">
            <span>{modules.length} module{modules.length === 1 ? "" : "s"}</span>
            {isFetching && !isLoading ? <span className="text-blue-700">Refreshing</span> : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {modules.length === 0 ? (
          <div className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 px-5 py-10 text-center shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)]">
            <p className="text-sm font-medium text-slate-700">No training modules found.</p>
            <p className="mt-2 text-sm text-slate-500">
              Adjust the department filter or search term to check a wider set.
            </p>
          </div>
        ) : null}

        {modules.map((module) => {
          const isPublished = Boolean(module.published_at);

          return (
            <div
              key={module.id}
              className="rounded-[1.75rem] border border-blue-100/80 bg-white/95 p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.16)] transition-all hover:border-blue-200 hover:bg-blue-50/35"
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

                <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-72 lg:justify-end">
                  <OptimisticRouteLink
                    href={`/training/modules/${module.id}`}
                    className="inline-flex items-center whitespace-nowrap rounded-full bg-blue-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900"
                  >
                    Open details
                  </OptimisticRouteLink>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
