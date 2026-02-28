import type { DepartmentCode } from "@/lib/constants/departments";

export type Department = {
  id: string;
  name: string;
  code: string;
};

export type Subdepartment = {
  id: string;
  department_id: string;
  name: string;
  code: string;
};

export type MetricsInputFormProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId?: string | null;
  availableDepartments: Department[];
  onSaved?: () => Promise<void> | void;
  redirectOnSave?: string;
};

export type DepartmentFlags = {
  deptCode: DepartmentCode;
  isNonRevenue: boolean;
  isNonCensus: boolean;
  showMedicationErrors: boolean;
  showPharmacyFields: boolean;
  isMedicalRecords: boolean;
};

export function toToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type MetricEntry = {
  id: string;
  metric_date: string;
  department_id: string;
  subdepartment_id: string | null;
  revenue_total: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  census_inpatient: number;
  equipment_utilization_pct: number;
  medication_error_count: number | null;
  created_at: string;
  updated_at: string;
  departments?: { name: string; code: string } | null;
  department_subdepartments?: { name: string; code: string } | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type MetricsResponse = {
  data: MetricEntry[];
  pagination: Pagination;
};

export type MetricsHistoryClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  availableDepartments: Department[];
};

export type EditValues = {
  revenue_total: string;
  census_total: string;
  census_opd: string;
  census_er: string;
  census_inpatient: string;
  equipment_utilization_pct: string;
  medication_error_count: string;
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}