"use client";

import type { QueryClient } from "@tanstack/react-query";

export const WORKSPACE_QUERY_STALE_TIME = 10 * 60 * 1000;
export const WORKSPACE_QUERY_GC_TIME = 30 * 60 * 1000;

type PrefetchRouteDataOptions = {
  href: string;
  queryClient: QueryClient;
  defaultDepartmentId: string | null;
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to prefetch ${url}.`);
  }

  return response.json() as Promise<T>;
}

function buildScopedQueryString(
  params: Record<string, string | null | undefined>,
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return query.toString();
}

export async function prefetchProtectedRouteData({
  href,
  queryClient,
  defaultDepartmentId,
}: PrefetchRouteDataOptions) {
  const month = currentMonthKey();

  if (href === "/productivity") {
    const summaryQueryString = buildScopedQueryString({
      month,
      department_id: defaultDepartmentId,
    });
    const recordsQueryString = buildScopedQueryString({
      report_month: `${month}-01`,
      limit: "100",
      department_id: defaultDepartmentId,
    });

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["productivity-summary", summaryQueryString],
        queryFn: () =>
          fetchJson(`/api/productivity/summary?${summaryQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["productivity-records", recordsQueryString],
        queryFn: () => fetchJson(`/api/productivity?${recordsQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
    ]);

    return;
  }

  if (href === "/equipment") {
    const summaryQueryString = buildScopedQueryString({
      month,
      department_id: defaultDepartmentId,
    });
    const assetsQueryString = buildScopedQueryString({
      limit: "200",
      department_id: defaultDepartmentId,
    });
    const recordsQueryString = buildScopedQueryString({
      limit: "200",
      report_month: `${month}-01`,
      department_id: defaultDepartmentId,
    });

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["equipment-summary", summaryQueryString],
        queryFn: () =>
          fetchJson(`/api/equipment/summary?${summaryQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["equipment-assets", assetsQueryString],
        queryFn: () => fetchJson(`/api/equipment/assets?${assetsQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["equipment-records", recordsQueryString],
        queryFn: () => fetchJson(`/api/equipment/records?${recordsQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
    ]);

    return;
  }

  if (href === "/training") {
    const summaryQueryString = buildScopedQueryString({
      month,
      department_id: defaultDepartmentId,
    });
    const modulesQueryString = buildScopedQueryString({
      limit: "200",
      department_id: defaultDepartmentId,
    });
    const complianceQueryString = buildScopedQueryString({
      limit: "200",
      report_month: `${month}-01`,
      department_id: defaultDepartmentId,
    });

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["training-summary", summaryQueryString],
        queryFn: () => fetchJson(`/api/training/summary?${summaryQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["training-modules", modulesQueryString],
        queryFn: () => fetchJson(`/api/training/modules?${modulesQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ["training-compliance", complianceQueryString],
        queryFn: () =>
          fetchJson(`/api/training/compliance?${complianceQueryString}`),
        staleTime: WORKSPACE_QUERY_STALE_TIME,
        gcTime: WORKSPACE_QUERY_GC_TIME,
      }),
    ]);
  }

  if (href === "/training/modules") {
    const modulesQueryString = buildScopedQueryString({
      limit: "200",
      department_id: defaultDepartmentId,
    });

    await queryClient.prefetchQuery({
      queryKey: ["training-modules", modulesQueryString],
      queryFn: () => fetchJson(`/api/training/modules?${modulesQueryString}`),
      staleTime: WORKSPACE_QUERY_STALE_TIME,
      gcTime: WORKSPACE_QUERY_GC_TIME,
    });
  }
}
