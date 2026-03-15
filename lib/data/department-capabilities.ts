import {
  MEDICATION_ERROR_DEPARTMENT_CODES,
  NON_CENSUS_DEPARTMENT_CODES,
  NON_REVENUE_DEPARTMENT_CODES,
  TURNAROUND_TIME_DEPARTMENT_CODES,
  type DepartmentCode,
} from "@/lib/constants/departments";

type DepartmentCapabilitySource = {
  code?: string | null;
  is_revenue?: boolean | null;
  is_census?: boolean | null;
  supports_turnaround_time?: boolean | null;
};

export type DepartmentCapabilities = {
  code: DepartmentCode | null;
  supportsRevenue: boolean;
  supportsCensus: boolean;
  supportsEquipment: boolean;
  supportsTurnaroundTime: boolean;
  tracksMedicationErrors: boolean;
  usesTransactionCategories: boolean;
  showsPharmacyRevenueSplit: boolean;
};

function normalizeDepartmentCode(value?: string | null): DepartmentCode | null {
  if (!value) {
    return null;
  }

  return value as DepartmentCode;
}

export function getDepartmentCapabilities(
  department?: DepartmentCapabilitySource | null,
): DepartmentCapabilities {
  const code = normalizeDepartmentCode(department?.code);
  const supportsRevenue =
    department?.is_revenue ?? (code ? !NON_REVENUE_DEPARTMENT_CODES.includes(code) : true);
  const supportsCensus =
    department?.is_census ?? (code ? !NON_CENSUS_DEPARTMENT_CODES.includes(code) : true);
  const supportsTurnaroundTime =
    department?.supports_turnaround_time
    ?? (code ? TURNAROUND_TIME_DEPARTMENT_CODES.includes(code) : false);

  return {
    code,
    supportsRevenue,
    supportsCensus,
    supportsEquipment: supportsRevenue,
    supportsTurnaroundTime,
    tracksMedicationErrors: code ? MEDICATION_ERROR_DEPARTMENT_CODES.includes(code) : false,
    usesTransactionCategories: code === "MEDR",
    showsPharmacyRevenueSplit: code === "PHAR",
  };
}

export function departmentSupportsRevenue(
  department?: DepartmentCapabilitySource | null,
) {
  return getDepartmentCapabilities(department).supportsRevenue;
}

export function departmentSupportsEquipment(
  department?: DepartmentCapabilitySource | null,
) {
  return getDepartmentCapabilities(department).supportsEquipment;
}

export function departmentSupportsTurnaroundTime(
  department?: DepartmentCapabilitySource | null,
) {
  return getDepartmentCapabilities(department).supportsTurnaroundTime;
}
