import type {
  DashboardDepartmentPerformance,
  DashboardDailyTrendPoint,
  DashboardNonRevenueResponse,
  DashboardOverviewResponse,
  MonitoringDepartment,
} from "@/types/monitoring";

export type Department = MonitoringDepartment;

export type DailyTrend = DashboardDailyTrendPoint;

export type DepartmentPerformance = DashboardDepartmentPerformance;

export type MetricsSummaryResponse = DashboardOverviewResponse;
export type NonRevenueSummaryResponse = DashboardNonRevenueResponse;

export type UserRole = "avp" | "division_head" | "department_head";
