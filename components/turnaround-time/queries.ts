import type { TurnaroundTimeSummaryResponse } from "@/types/monitoring";
import type { TurnaroundTimeListResponse } from "./types";

type TurnaroundTimeQueryState = {
  selectedMonth: string;
  selectedDepartmentId: string;
  selectedSubdepartmentId: string;
  serviceFilter: string;
};

type TurnaroundTimeListQueryState = TurnaroundTimeQueryState & {
  page: number;
  limit: number;
};

function buildDateRange(selectedMonth: string) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { startDate, endDate };
}

export function buildTurnaroundTimeSummaryQueryString({
  selectedMonth,
  selectedDepartmentId,
  selectedSubdepartmentId,
  serviceFilter,
}: TurnaroundTimeQueryState) {
  const params = new URLSearchParams();
  params.set("month", selectedMonth);

  if (selectedDepartmentId) {
    params.set("department_id", selectedDepartmentId);
  }

  if (selectedSubdepartmentId) {
    params.set("subdepartment_id", selectedSubdepartmentId);
  }

  if (serviceFilter.trim()) {
    params.set("service", serviceFilter.trim());
  }

  return params.toString();
}

export function buildTurnaroundTimeListQueryString({
  page,
  limit,
  selectedMonth,
  selectedDepartmentId,
  selectedSubdepartmentId,
  serviceFilter,
}: TurnaroundTimeListQueryState) {
  const params = new URLSearchParams();
  const { startDate, endDate } = buildDateRange(selectedMonth);

  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("start_date", startDate);
  params.set("end_date", endDate);

  if (selectedDepartmentId) {
    params.set("department_id", selectedDepartmentId);
  }

  if (selectedSubdepartmentId) {
    params.set("subdepartment_id", selectedSubdepartmentId);
  }

  if (serviceFilter.trim()) {
    params.set("service", serviceFilter.trim());
  }

  return params.toString();
}

export function getTurnaroundTimeSummaryQueryKey(queryString: string) {
  return ["turnaround-time-summary", queryString] as const;
}

export function getTurnaroundTimeListQueryKey(queryString: string) {
  return ["turnaround-time", queryString] as const;
}

export async function fetchTurnaroundTimeSummary(
  queryString: string,
): Promise<TurnaroundTimeSummaryResponse> {
  const response = await fetch(`/api/turnaround-time/summary?${queryString}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load turnaround time summary.");
  }

  return response.json();
}

export async function fetchTurnaroundTimeList(
  queryString: string,
): Promise<TurnaroundTimeListResponse> {
  const response = await fetch(`/api/turnaround-time?${queryString}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load turnaround time entries.");
  }

  return response.json();
}
