import type { EquipmentStatus } from "@/lib/constants/equipment";
import type { IncidentType } from "@/lib/constants/incidents";
import type { MetricCategory } from "@/lib/constants/metrics";
import type { UserRole } from "@/types/database";

export type MonitoringDepartment = {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
  is_census?: boolean;
  is_revenue?: boolean;
  supports_turnaround_time?: boolean;
};

export type MonitoringFilters = {
  month: string;
  report_month: string;
  department_id: string | null;
  available_departments: MonitoringDepartment[];
};

export type MonitoringRoleScope = {
  role: UserRole;
  member_department_ids: string[];
};

export type EquipmentAssetItem = {
  id: string;
  department_id: string;
  name: string;
  category: string;
  is_active: boolean;
  created_at: string;
  departments?: { name: string; code: string } | null;
};

export type EquipmentRecordItem = {
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
  equipment_assets?: EquipmentAssetItem | null;
};

export type EquipmentAssetSnapshot = {
  equipment_asset_id: string;
  equipment_name: string;
  category: string;
  department_id: string;
  department_name: string;
  is_active: boolean;
  has_record: boolean;
  available_hours: number;
  actual_usage_hours: number;
  utilization_pct: number;
  status: EquipmentStatus | null;
  notes: string | null;
  updated_at: string | null;
};

export type EquipmentDepartmentSummary = {
  department_id: string;
  department_name: string;
  asset_count: number;
  reported_asset_count: number;
  available_hours: number;
  actual_usage_hours: number;
  utilization_pct: number;
  status_breakdown: Record<EquipmentStatus, number>;
};

export type EquipmentTrendPoint = {
  month: string;
  available_hours: number;
  actual_usage_hours: number;
  utilization_pct: number;
};

export type EquipmentSummaryResponse = {
  filters: MonitoringFilters;
  role_scope: MonitoringRoleScope;
  totals: {
    asset_count: number;
    reported_asset_count: number;
    available_hours: number;
    actual_usage_hours: number;
    utilization_pct: number;
    status_breakdown: Record<EquipmentStatus, number>;
  };
  previous_totals: {
    available_hours: number;
    actual_usage_hours: number;
    utilization_pct: number;
  };
  asset_rows: EquipmentAssetSnapshot[];
  department_summary: EquipmentDepartmentSummary[];
  trend: EquipmentTrendPoint[];
};

export type ProductivityRecordItem = {
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
  departments?: { name: string; code: string } | null;
};

export type ProductivityDepartmentSummary = {
  department_id: string;
  department_name: string;
  procedures_performed: number;
  staff_on_duty_count: number;
  productivity_ratio: number;
};

export type ProductivityTrendPoint = {
  month: string;
  procedures_performed: number;
  staff_on_duty_count: number;
  productivity_ratio: number;
};

export type ProductivitySummaryResponse = {
  filters: MonitoringFilters;
  role_scope: MonitoringRoleScope;
  totals: {
    procedures_performed: number;
    staff_on_duty_count: number;
    productivity_ratio: number;
  };
  previous_totals: {
    procedures_performed: number;
    staff_on_duty_count: number;
    productivity_ratio: number;
  };
  department_ranking: ProductivityDepartmentSummary[];
  trend: ProductivityTrendPoint[];
};

export type IncidentSummaryDepartment = {
  department_id: string;
  department_name: string;
  incident_count: number;
  unresolved_count: number;
  patient_fall_count: number;
  patients_served: number | null;
  incident_rate_per_1000: number | null;
  patient_fall_rate_per_1000: number | null;
};

export type IncidentTypeDistribution = {
  incident_type: IncidentType;
  label: string;
  count: number;
};

export type IncidentTrendPoint = {
  month: string;
  incident_count: number;
  unresolved_count: number;
  patient_fall_count: number;
};

export type IncidentsSummaryResponse = {
  filters: MonitoringFilters;
  role_scope: MonitoringRoleScope;
  totals: {
    incident_count: number;
    unresolved_count: number;
    patient_fall_count: number;
    patients_served: number | null;
    incident_rate_per_1000: number | null;
    patient_fall_rate_per_1000: number | null;
  };
  previous_totals: {
    incident_count: number;
    unresolved_count: number;
    patient_fall_count: number;
  };
  type_distribution: IncidentTypeDistribution[];
  department_summary: IncidentSummaryDepartment[];
  trend: IncidentTrendPoint[];
};

export type TrainingModuleItem = {
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
  departments?: { name: string; code: string } | null;
  profiles?: { full_name: string; role: string } | null;
};

export type TrainingComplianceItem = {
  id: string;
  report_month: string;
  training_module_id: string;
  department_id: string;
  assigned_staff_count: number;
  completed_staff_count: number;
  updated_by: string;
  created_at: string;
  updated_at: string;
  training_modules?: TrainingModuleItem | null;
  departments?: { name: string; code: string } | null;
};

export type TrainingDepartmentCompliance = {
  department_id: string;
  department_name: string;
  assigned_staff_count: number;
  completed_staff_count: number;
  completion_rate: number;
};

export type TrainingModuleComplianceSummary = {
  training_module_id: string;
  title: string;
  is_system_wide: boolean;
  department_name: string | null;
  assigned_staff_count: number;
  completed_staff_count: number;
  completion_rate: number;
  published_at: string | null;
  qr_token: string;
  material_mime_type: string;
};

export type TrainingTrendPoint = {
  month: string;
  assigned_staff_count: number;
  completed_staff_count: number;
  completion_rate: number;
};

export type TrainingSummaryResponse = {
  filters: MonitoringFilters;
  role_scope: MonitoringRoleScope;
  totals: {
    published_module_count: number;
    assigned_staff_count: number;
    completed_staff_count: number;
    pending_staff_count: number;
    completion_rate: number;
  };
  previous_totals: {
    assigned_staff_count: number;
    completed_staff_count: number;
    completion_rate: number;
  };
  module_compliance: TrainingModuleComplianceSummary[];
  department_compliance: TrainingDepartmentCompliance[];
  trend: TrainingTrendPoint[];
};

export type DashboardDailyTrendPoint = {
  date: string;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
  medication_error_count: number;
};

export type DashboardMetricSource = "daily" | "monthly" | "mixed";

export type DashboardDepartmentPerformance = {
  department_id: string;
  department_name: string;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
  medication_error_count: number;
};

export type DashboardUnresolvedPreviewItem = {
  id: string;
  sbar_situation: string;
  date_of_incident: string;
  departments?: { name: string; code?: string } | null;
};

export type DashboardOverviewResponse = {
  filters: {
    month: string;
    department_id: string | null;
    available_departments: MonitoringDepartment[];
  };
  role_scope: MonitoringRoleScope;
  totals: {
    revenue_total: number;
    self_pay_count: number;
    hmo_count: number;
    guarantee_letter_count: number;
    monthly_input_count: number;
    census_total: number;
    census_opd: number;
    census_er: number;
    census_walk_in: number;
    census_inpatient: number;
    equipment_utilization_pct: number;
    medication_error_count: number;
    open_incidents_count: number;
  };
  previous_totals: {
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    equipment_utilization_pct: number;
    medication_error_count: number;
  };
  category_sources: Record<MetricCategory, DashboardMetricSource>;
  best_performing_department: DashboardDepartmentPerformance | null;
  daily_trend: DashboardDailyTrendPoint[];
  department_performance: DashboardDepartmentPerformance[];
  unresolved_preview: DashboardUnresolvedPreviewItem[];
  legacy_metrics: {
    equipment_utilization_pct: number;
  };
};

export type DashboardNonRevenueResponse = {
  filters: {
    month: string;
    department_id: string | null;
  };
  totals: {
    transaction_total: number;
    medication_error_count: number;
    category_count: number;
  };
  category_summary: {
    category: string;
    total_count: number;
  }[];
  daily_totals: {
    date: string;
    total: number;
  }[];
};

export type TurnaroundTimeEntryItem = {
  id: string;
  department_id: string;
  subdepartment_id: string | null;
  service_name: string;
  case_reference: string;
  started_at: string;
  completed_at: string;
  notes: string | null;
  recorded_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  departments?: { name: string; code: string } | null;
  department_subdepartments?: { name: string; code: string } | null;
  profiles?: { full_name: string; role: string } | null;
  duration_minutes?: number;
};

export type TurnaroundTimeSummaryResponse = {
  filters: {
    month: string;
    department_id: string | null;
    subdepartment_id: string | null;
    service: string | null;
    available_departments: MonitoringDepartment[];
  };
  role_scope: MonitoringRoleScope;
  totals: {
    entry_count: number;
    average_minutes: number;
    median_minutes: number;
    longest_minutes: number;
  };
  services: {
    service_name: string;
    entry_count: number;
    average_minutes: number;
  }[];
};
