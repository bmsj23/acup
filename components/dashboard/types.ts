export type Department = { id: string; name: string; code: string };

export type DailyTrend = {
  date: string;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
};

export type DepartmentPerformance = {
  department_id: string;
  department_name: string;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
};

export type MetricsSummaryResponse = {
  filters: {
    month: string;
    department_id: string | null;
    available_departments: Department[];
  };
  role_scope: {
    role: "avp" | "division_head" | "department_head";
    member_department_ids: string[];
  };
  totals: {
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    census_opd: number;
    census_er: number;
    equipment_utilization_pct: number;
  };
  previous_totals?: {
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    equipment_utilization_pct: number;
  };
  best_performing_department: DepartmentPerformance | null;
  daily_trend: DailyTrend[];
  department_performance: DepartmentPerformance[];
};

export type UserRole = "avp" | "division_head" | "department_head";