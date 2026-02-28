export type UserRole = "avp" | "division_head" | "department_head";

export type DocumentStatus = "active" | "archived" | "deleted";

export type AnnouncementPriority = "normal" | "urgent" | "critical";

export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "DOWNLOAD"
  | "LOGIN"
  | "LOGOUT"
  | "ACCESS_DENIED";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentMembership {
  id: string;
  user_id: string;
  department_id: string;
  is_primary: boolean;
  joined_at: string;
}

export interface DepartmentSubdepartment {
  id: string;
  department_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentMetricDaily {
  id: string;
  metric_date: string;
  department_id: string;
  subdepartment_id: string | null;
  revenue_total: number;
  pharmacy_revenue_inpatient: number | null;
  pharmacy_revenue_opd: number | null;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  census_walk_in: number | null;
  census_inpatient: number | null;
  equipment_utilization_pct: number;
  notes: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface MessageThread {
  id: string;
  title: string;
  department_id: string | null;
  is_system_wide: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MessageMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  department_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  checksum: string;
  version: number;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string | null;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  performed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  performed_at: string;
}