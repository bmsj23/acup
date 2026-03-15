import type {
  DashboardNonRevenueResponse,
  DashboardOverviewResponse,
} from "@/types/monitoring";

export function buildDashboardScopeQueryString(
  month: string,
  departmentId: string,
) {
  const params = new URLSearchParams();
  params.set("month", month);
  if (departmentId) {
    params.set("department_id", departmentId);
  }
  return params.toString();
}

export function getDashboardOverviewQueryKey(
  month: string,
  departmentId: string,
) {
  return ["dashboard-overview", month, departmentId] as const;
}

export function getDashboardNonRevenueQueryKey(
  month: string,
  departmentId: string,
) {
  return ["dashboard-non-revenue", month, departmentId] as const;
}

export async function fetchDashboardOverview(
  queryString: string,
): Promise<DashboardOverviewResponse> {
  const response = await fetch(`/api/dashboard/overview?${queryString}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load dashboard overview.");
  }

  return response.json();
}

export async function fetchDashboardNonRevenue(
  queryString: string,
): Promise<DashboardNonRevenueResponse> {
  const response = await fetch(`/api/dashboard/non-revenue?${queryString}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load non-revenue dashboard.");
  }

  return response.json();
}
