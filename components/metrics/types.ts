import type { DepartmentCode } from "@/lib/constants/departments";
import type { MetricCategory } from "@/lib/constants/metrics";

export type Department = {
  id: string;
  name: string;
  code: string;
  is_revenue?: boolean;
  is_census?: boolean;
  supports_turnaround_time?: boolean;
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
  supportsRevenue: boolean;
  supportsCensus: boolean;
  supportsEquipment: boolean;
  tracksMedicationErrors: boolean;
  showsPharmacyFields: boolean;
  usesTransactionCategories: boolean;
};

export function toToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type MetricTransactionEntry = {
  category: string;
  count: number;
};

export type MetricEntry = {
  id: string;
  metric_date: string;
  department_id: string;
  subdepartment_id: string | null;
  revenue_total: number;
  self_pay_count: number;
  hmo_count: number;
  guarantee_letter_count: number;
  pharmacy_revenue_inpatient: number | null;
  pharmacy_revenue_opd: number | null;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  census_walk_in: number | null;
  census_inpatient: number | null;
  equipment_utilization_pct: number;
  medication_error_count: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  transaction_entries: MetricTransactionEntry[];
  departments?: {
    name: string;
    code: string;
    is_revenue?: boolean;
    is_census?: boolean;
    supports_turnaround_time?: boolean;
  } | null;
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
  self_pay_count: string;
  hmo_count: string;
  guarantee_letter_count: string;
  pharmacy_revenue_inpatient: string;
  pharmacy_revenue_opd: string;
  census_total: string;
  census_opd: string;
  census_er: string;
  census_walk_in: string;
  census_inpatient: string;
  monthly_input_count: string;
  equipment_utilization_pct: string;
  medication_error_count: string;
  notes: string;
  transaction_entries: MetricTransactionEntry[];
  category: MetricCategory;
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}
