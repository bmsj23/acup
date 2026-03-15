import type { IncidentsResponse, DepartmentItem } from "./types";

type IncidentListQueryParams = {
  page: number;
  limit: number;
  search: string;
  resolutionFilter: "open" | "resolved" | "all";
  incidentTypeFilter: string;
  departmentFilter: string;
  selectedMonth: string;
  monthFilterActive: boolean;
};

export function buildIncidentListQueryString({
  page,
  limit,
  search,
  resolutionFilter,
  incidentTypeFilter,
  departmentFilter,
  selectedMonth,
  monthFilterActive,
}: IncidentListQueryParams) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (resolutionFilter === "open") {
    params.set("is_resolved", "false");
  } else if (resolutionFilter === "resolved") {
    params.set("is_resolved", "true");
  } else {
    params.set("is_resolved", "all");
  }

  if (incidentTypeFilter !== "all") {
    params.set("incident_type", incidentTypeFilter);
  }

  if (departmentFilter !== "all") {
    params.set("department_id", departmentFilter);
  }

  if (monthFilterActive) {
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    params.set("start_date", startDate);
    params.set("end_date", endDate);
  }

  return params.toString();
}

export function getIncidentListQueryKey(queryString: string) {
  return ["incidents", queryString] as const;
}

export function getIncidentDepartmentsQueryKey() {
  return ["incident-departments"] as const;
}

export async function fetchIncidentList(
  queryString: string,
): Promise<IncidentsResponse> {
  const response = await fetch(`/api/incidents?${queryString}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load incidents.");
  }

  return response.json();
}

export async function fetchIncidentDepartments(): Promise<DepartmentItem[]> {
  const response = await fetch("/api/departments?limit=200", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: DepartmentItem[] };
  return payload.data ?? [];
}
