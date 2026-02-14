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