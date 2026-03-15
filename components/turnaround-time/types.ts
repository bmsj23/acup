import type {
  MonitoringDepartment,
  TurnaroundTimeEntryItem,
} from "@/types/monitoring";

export type TurnaroundTimePagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type TurnaroundTimeListResponse = {
  data: TurnaroundTimeEntryItem[];
  pagination: TurnaroundTimePagination;
};

export type TurnaroundTimeClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  availableDepartments: MonitoringDepartment[];
};

export type TurnaroundTimeFormState = {
  department_id: string;
  subdepartment_id: string;
  service_name: string;
  case_reference: string;
  started_at: string;
  completed_at: string;
  notes: string;
};
