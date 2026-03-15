export type UserRole = "avp" | "division_head" | "department_head";

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
  is_revenue?: boolean;
  is_census?: boolean;
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
  medication_error_count?: number | null;
  notes: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus = "active" | "idle" | "maintenance";

export interface EquipmentAsset {
  id: string;
  department_id: string;
  name: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface EquipmentUtilizationMonthly {
  id: string;
  report_month: string;
  equipment_asset_id: string;
  available_hours: number;
  actual_usage_hours: number;
  status: EquipmentStatus;
  notes: string | null;
  recorded_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentProductivityMonthly {
  id: string;
  report_month: string;
  department_id: string;
  procedures_performed: number;
  staff_on_duty_count: number;
  notes: string | null;
  recorded_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export type IncidentType =
  | "patient_fall"
  | "equipment_malfunction"
  | "patient_identification_error"
  | "procedure_related_incident"
  | "near_miss";

export interface Incident {
  id: string;
  department_id: string;
  reported_by: string | null;
  date_of_reporting: string;
  date_of_incident: string;
  time_of_incident: string;
  incident_type: IncidentType;
  sbar_situation: string;
  sbar_background: string;
  sbar_assessment: string;
  sbar_recommendation: string;
  announcement_id: string | null;
  file_name: string | null;
  file_storage_path: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  department_id: string | null;
  is_system_wide: boolean;
  material_file_name: string;
  material_storage_path: string;
  material_mime_type: string;
  material_size_bytes: number;
  qr_token: string;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingComplianceMonthly {
  id: string;
  report_month: string;
  training_module_id: string;
  department_id: string;
  assigned_staff_count: number;
  completed_staff_count: number;
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
