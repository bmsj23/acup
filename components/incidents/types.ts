export type DepartmentItem = {
  id: string;
  name: string;
};

export type ReporterProfile = {
  full_name: string;
  role: string;
};

export type IncidentDepartment = {
  name: string;
  code: string;
};

export type IncidentItem = {
  id: string;
  department_id: string;
  reported_by: string;
  date_of_reporting: string;
  date_of_incident: string;
  time_of_incident: string;
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
  profiles?: ReporterProfile | null;
  departments?: IncidentDepartment | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type IncidentsResponse = {
  data: IncidentItem[];
  pagination: Pagination;
};

export type ViewState = "list" | "detail" | "create";