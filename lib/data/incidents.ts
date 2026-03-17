import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { INCIDENT_TYPE_LABELS, INCIDENT_TYPES } from "@/lib/constants/incidents";
import { buildTrailingMonths, ratePerThousand } from "@/lib/data/monitoring";
import type {
  IncidentsSummaryResponse,
  MonitoringDepartment,
} from "@/types/monitoring";

export const createIncidentSchema = z.object({
  department_id: z.string().uuid(),
  date_of_reporting: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_of_incident: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_of_incident: z.string().regex(/^\d{2}:\d{2}$/),
  incident_type: z.enum(INCIDENT_TYPES),
  sbar_situation: z.string().trim().min(1).max(5000),
  sbar_background: z.string().trim().min(1).max(5000),
  sbar_assessment: z.string().trim().min(1).max(5000),
  sbar_recommendation: z.string().trim().min(1).max(5000),
  file_name: z.string().trim().min(1).max(255).nullable().optional(),
  file_storage_path: z.string().trim().min(1).max(1024).nullable().optional(),
  file_mime_type: z.string().trim().min(1).max(255).nullable().optional(),
  file_size_bytes: z.number().int().positive().max(25 * 1024 * 1024).nullable().optional(),
});

export const updateIncidentSchema = z.object({
  incident_type: z.enum(INCIDENT_TYPES).optional(),
  sbar_situation: z.string().trim().min(1).max(5000).optional(),
  sbar_background: z.string().trim().min(1).max(5000).optional(),
  sbar_assessment: z.string().trim().min(1).max(5000).optional(),
  sbar_recommendation: z.string().trim().min(1).max(5000).optional(),
  is_resolved: z.boolean().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;

const incidentSelect =
  "id, department_id, reported_by, date_of_reporting, date_of_incident, time_of_incident, incident_type, sbar_situation, sbar_background, sbar_assessment, sbar_recommendation, announcement_id, file_name, file_storage_path, file_mime_type, file_size_bytes, is_resolved, created_at, updated_at, profiles!reported_by(full_name, role), departments!department_id(name, code)";

function getIncidentTypeLabel(incidentType: (typeof INCIDENT_TYPES)[number]) {
  switch (incidentType) {
    case "patient_fall":
      return INCIDENT_TYPE_LABELS.patient_fall;
    case "equipment_malfunction":
      return INCIDENT_TYPE_LABELS.equipment_malfunction;
    case "patient_identification_error":
      return INCIDENT_TYPE_LABELS.patient_identification_error;
    case "procedure_related_incident":
      return INCIDENT_TYPE_LABELS.procedure_related_incident;
    case "near_miss":
    default:
      return INCIDENT_TYPE_LABELS.near_miss;
  }
}

export async function listIncidents(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    reported_by?: string | null;
    is_resolved?: boolean | null;
    incident_type?: (typeof INCIDENT_TYPES)[number] | null;
    start_date?: string | null;
    end_date?: string | null;
    search?: string | null;
  },
) {
  let query = supabase
    .from("incidents")
    .select(incidentSelect, { count: "exact" })
    .order("is_resolved", { ascending: true })
    .order("date_of_incident", { ascending: false })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.reported_by) {
    query = query.eq("reported_by", params.reported_by);
  }

  if (params.is_resolved !== null && params.is_resolved !== undefined) {
    query = query.eq("is_resolved", params.is_resolved);
  }

  if (params.incident_type) {
    query = query.eq("incident_type", params.incident_type);
  }

  if (params.start_date) {
    query = query.gte("date_of_incident", params.start_date);
  }

  if (params.end_date) {
    query = query.lte("date_of_incident", params.end_date);
  }

  if (params.search) {
    query = query.or(
      `sbar_situation.ilike.%${params.search}%,sbar_background.ilike.%${params.search}%`,
    );
  }

  return await query;
}

export async function createIncident(
  supabase: SupabaseClient,
  payload: CreateIncidentInput,
  userId: string,
) {
  return await supabase
    .from("incidents")
    .insert({
      department_id: payload.department_id,
      reported_by: userId,
      date_of_reporting: payload.date_of_reporting,
      date_of_incident: payload.date_of_incident,
      time_of_incident: payload.time_of_incident,
      incident_type: payload.incident_type,
      sbar_situation: payload.sbar_situation,
      sbar_background: payload.sbar_background,
      sbar_assessment: payload.sbar_assessment,
      sbar_recommendation: payload.sbar_recommendation,
      file_name: payload.file_name ?? null,
      file_storage_path: payload.file_storage_path ?? null,
      file_mime_type: payload.file_mime_type ?? null,
      file_size_bytes: payload.file_size_bytes ?? null,
    })
    .select(incidentSelect)
    .single();
}

export async function getIncidentById(supabase: SupabaseClient, id: string) {
  return await supabase.from("incidents").select(incidentSelect).eq("id", id).single();
}

export async function updateIncidentById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateIncidentInput,
) {
  const updateFields: Record<string, unknown> = {};

  if (payload.incident_type !== undefined) updateFields.incident_type = payload.incident_type;
  if (payload.sbar_situation !== undefined) updateFields.sbar_situation = payload.sbar_situation;
  if (payload.sbar_background !== undefined) updateFields.sbar_background = payload.sbar_background;
  if (payload.sbar_assessment !== undefined) updateFields.sbar_assessment = payload.sbar_assessment;
  if (payload.sbar_recommendation !== undefined) updateFields.sbar_recommendation = payload.sbar_recommendation;
  if (payload.is_resolved !== undefined) updateFields.is_resolved = payload.is_resolved;

  return await supabase
    .from("incidents")
    .update(updateFields)
    .eq("id", id)
    .select(incidentSelect)
    .single();
}

export async function linkAnnouncementToIncident(
  supabase: SupabaseClient,
  incidentId: string,
  announcementId: string,
) {
  return await supabase
    .from("incidents")
    .update({ announcement_id: announcementId })
    .eq("id", incidentId);
}

export async function deleteIncidentById(supabase: SupabaseClient, id: string) {
  return await supabase
    .from("incidents")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function getRecentUnresolvedIncidents(
  supabase: SupabaseClient,
  limit = 5,
  reportedBy?: string | null,
) {
  let query = supabase
    .from("incidents")
    .select(incidentSelect)
    .eq("is_resolved", false)
    .order("date_of_incident", { ascending: false })
    .limit(limit);

  if (reportedBy) {
    query = query.eq("reported_by", reportedBy);
  }

  return await query;
}

export async function getIncidentCountForMonth(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  departmentId?: string | null,
  reportedBy?: string | null,
) {
  let query = supabase
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .gte("date_of_incident", startDate)
    .lte("date_of_incident", endDate);

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  if (reportedBy) {
    query = query.eq("reported_by", reportedBy);
  }

  return await query;
}

type IncidentSummaryRow = {
  id: string;
  department_id: string;
  date_of_incident: string;
  incident_type: (typeof INCIDENT_TYPES)[number];
  is_resolved: boolean;
  departments?: { name?: string; code?: string } | null;
};

type CensusSummaryRow = {
  department_id: string;
  metric_date: string;
  census_total: number;
};

type MonthlyCensusSummaryRow = {
  department_id: string;
  report_month: string;
  census_total: number;
};

export async function buildIncidentSummary(
  supabase: SupabaseClient,
  params: {
    month: string;
    startDate: string;
    endDate: string;
    prevStartDate: string;
    prevEndDate: string;
    departmentId?: string | null;
    reporterId?: string | null;
    availableDepartments: MonitoringDepartment[];
  },
): Promise<Omit<IncidentsSummaryResponse, "filters" | "role_scope">> {
  const trailingMonths = buildTrailingMonths(params.month, 6);
  const trendStartDate = `${trailingMonths[0]?.month ?? params.month}-01`;

  let currentIncidentsQuery = supabase
    .from("incidents")
    .select("id, department_id, date_of_incident, incident_type, is_resolved, departments!department_id(name, code)")
    .gte("date_of_incident", params.startDate)
    .lte("date_of_incident", params.endDate);

  let previousIncidentsQuery = supabase
    .from("incidents")
    .select("id, department_id, date_of_incident, incident_type, is_resolved, departments!department_id(name, code)")
    .gte("date_of_incident", params.prevStartDate)
    .lte("date_of_incident", params.prevEndDate);

  let trendIncidentsQuery = supabase
    .from("incidents")
    .select("id, department_id, date_of_incident, incident_type, is_resolved")
    .gte("date_of_incident", trendStartDate)
    .lte("date_of_incident", params.endDate);

  let censusQuery = supabase
    .from("department_metrics_daily")
    .select("department_id, metric_date, census_total")
    .is("subdepartment_id", null)
    .gte("metric_date", trendStartDate)
    .lte("metric_date", params.endDate);
  let monthlyCensusQuery = supabase
    .from("department_metrics_monthly")
    .select("department_id, report_month, census_total")
    .eq("category", "census")
    .is("subdepartment_id", null)
    .gte("report_month", `${trendStartDate.slice(0, 7)}-01`)
    .lte("report_month", `${params.endDate.slice(0, 7)}-01`);

  if (params.departmentId) {
    currentIncidentsQuery = currentIncidentsQuery.eq("department_id", params.departmentId);
    previousIncidentsQuery = previousIncidentsQuery.eq("department_id", params.departmentId);
    trendIncidentsQuery = trendIncidentsQuery.eq("department_id", params.departmentId);
    censusQuery = censusQuery.eq("department_id", params.departmentId);
    monthlyCensusQuery = monthlyCensusQuery.eq("department_id", params.departmentId);
  }

  if (params.reporterId) {
    currentIncidentsQuery = currentIncidentsQuery.eq("reported_by", params.reporterId);
    previousIncidentsQuery = previousIncidentsQuery.eq("reported_by", params.reporterId);
    trendIncidentsQuery = trendIncidentsQuery.eq("reported_by", params.reporterId);
  }

  const [currentIncidentsResult, previousIncidentsResult, trendIncidentsResult, censusResult, monthlyCensusResult] =
    await Promise.all([
      currentIncidentsQuery,
      previousIncidentsQuery,
      trendIncidentsQuery,
      censusQuery,
      monthlyCensusQuery,
    ]);

  const error =
    currentIncidentsResult.error
    ?? previousIncidentsResult.error
    ?? trendIncidentsResult.error
    ?? censusResult.error
    ?? monthlyCensusResult.error;
  if (error) {
    throw error;
  }

  const currentRows = (currentIncidentsResult.data ?? []) as IncidentSummaryRow[];
  const previousRows = (previousIncidentsResult.data ?? []) as IncidentSummaryRow[];
  const trendRows = (trendIncidentsResult.data ?? []) as IncidentSummaryRow[];
  const censusRows = ((censusResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
    department_id: row.department_id as string,
    metric_date: row.metric_date as string,
    census_total: Number(row.census_total ?? 0),
  })) as CensusSummaryRow[];
  const monthlyCensusRows = ((monthlyCensusResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
    department_id: row.department_id as string,
    report_month: row.report_month as string,
    census_total: Number(row.census_total ?? 0),
  })) as MonthlyCensusSummaryRow[];

  const departmentMetaMap = new Map(
    params.availableDepartments.map((department) => [department.id, department]),
  );

  const denominatorByDepartmentAndMonth = new Map<string, number>();

  for (const row of censusRows) {
    const monthKey = row.metric_date.slice(0, 7);
    const mapKey = `${row.department_id}:${monthKey}`;
    denominatorByDepartmentAndMonth.set(
      mapKey,
      (denominatorByDepartmentAndMonth.get(mapKey) ?? 0) + row.census_total,
    );
  }

  for (const row of monthlyCensusRows) {
    const monthKey = row.report_month.slice(0, 7);
    denominatorByDepartmentAndMonth.set(
      `${row.department_id}:${monthKey}`,
      row.census_total,
    );
  }

  const typeDistributionMap = new Map<(typeof INCIDENT_TYPES)[number], number>();
  const departmentSummaryMap = new Map<
    string,
    {
      department_id: string;
      department_name: string;
      incident_count: number;
      unresolved_count: number;
      patient_fall_count: number;
      patients_served: number | null;
      incident_rate_per_1000: number | null;
      patient_fall_rate_per_1000: number | null;
    }
  >();

  for (const row of currentRows) {
    typeDistributionMap.set(
      row.incident_type,
      (typeDistributionMap.get(row.incident_type) ?? 0) + 1,
    );

    const department = departmentMetaMap.get(row.department_id);
    const patientsServed =
      department?.is_census
        ? (denominatorByDepartmentAndMonth.get(`${row.department_id}:${params.month}`) ?? 0)
        : null;

    const current =
      departmentSummaryMap.get(row.department_id)
      ?? {
        department_id: row.department_id,
        department_name:
          row.departments?.name
          ?? department?.name
          ?? "Unknown Department",
        incident_count: 0,
        unresolved_count: 0,
        patient_fall_count: 0,
        patients_served: patientsServed && patientsServed > 0 ? patientsServed : null,
        incident_rate_per_1000: null,
        patient_fall_rate_per_1000: null,
      };

    current.incident_count += 1;
    current.unresolved_count += row.is_resolved ? 0 : 1;
    current.patient_fall_count += row.incident_type === "patient_fall" ? 1 : 0;
    current.patients_served =
      patientsServed && patientsServed > 0 ? patientsServed : current.patients_served;
    current.incident_rate_per_1000 = ratePerThousand(
      current.incident_count,
      current.patients_served,
    );
    current.patient_fall_rate_per_1000 = ratePerThousand(
      current.patient_fall_count,
      current.patients_served,
    );

    departmentSummaryMap.set(row.department_id, current);
  }

  if (params.departmentId && !departmentSummaryMap.has(params.departmentId)) {
    const department = departmentMetaMap.get(params.departmentId);
    const patientsServed =
      department?.is_census
        ? (denominatorByDepartmentAndMonth.get(`${params.departmentId}:${params.month}`) ?? 0)
        : null;

    departmentSummaryMap.set(params.departmentId, {
      department_id: params.departmentId,
      department_name: department?.name ?? "Unknown Department",
      incident_count: 0,
      unresolved_count: 0,
      patient_fall_count: 0,
      patients_served: patientsServed && patientsServed > 0 ? patientsServed : null,
      incident_rate_per_1000: null,
      patient_fall_rate_per_1000: null,
    });
  }

  const eligibleDepartmentIds = params.availableDepartments
    .filter((department) => department.is_census)
    .map((department) => department.id);

  const selectedPatientsServed = params.departmentId
    ? (denominatorByDepartmentAndMonth.get(`${params.departmentId}:${params.month}`) ?? 0)
    : eligibleDepartmentIds.reduce(
        (sum, departmentId) =>
          sum + (denominatorByDepartmentAndMonth.get(`${departmentId}:${params.month}`) ?? 0),
        0,
      );

  const previousTotals = previousRows.reduce(
    (accumulator, row) => {
      accumulator.incident_count += 1;
      accumulator.unresolved_count += row.is_resolved ? 0 : 1;
      accumulator.patient_fall_count += row.incident_type === "patient_fall" ? 1 : 0;
      return accumulator;
    },
    {
      incident_count: 0,
      unresolved_count: 0,
      patient_fall_count: 0,
    },
  );

  const currentTotals = currentRows.reduce(
    (accumulator, row) => {
      accumulator.incident_count += 1;
      accumulator.unresolved_count += row.is_resolved ? 0 : 1;
      accumulator.patient_fall_count += row.incident_type === "patient_fall" ? 1 : 0;
      return accumulator;
    },
    {
      incident_count: 0,
      unresolved_count: 0,
      patient_fall_count: 0,
    },
  );

  const rateEligibleIncidentRows = params.departmentId
    ? currentRows.filter((row) => departmentMetaMap.get(row.department_id)?.is_census)
    : currentRows.filter((row) => eligibleDepartmentIds.includes(row.department_id));

  const rateEligibleIncidentCount = rateEligibleIncidentRows.length;
  const rateEligiblePatientFallCount = rateEligibleIncidentRows.filter(
    (row) => row.incident_type === "patient_fall",
  ).length;

  const trend = trailingMonths.map((monthItem) => {
    const monthlyRows = trendRows.filter(
      (row) => row.date_of_incident.slice(0, 7) === monthItem.month,
    );

    return {
      month: monthItem.month,
      incident_count: monthlyRows.length,
      unresolved_count: monthlyRows.filter((row) => !row.is_resolved).length,
      patient_fall_count: monthlyRows.filter((row) => row.incident_type === "patient_fall").length,
    };
  });

  return {
    totals: {
      incident_count: currentTotals.incident_count,
      unresolved_count: currentTotals.unresolved_count,
      patient_fall_count: currentTotals.patient_fall_count,
      patients_served: selectedPatientsServed > 0 ? selectedPatientsServed : null,
      incident_rate_per_1000: ratePerThousand(
        rateEligibleIncidentCount,
        selectedPatientsServed > 0 ? selectedPatientsServed : null,
      ),
      patient_fall_rate_per_1000: ratePerThousand(
        rateEligiblePatientFallCount,
        selectedPatientsServed > 0 ? selectedPatientsServed : null,
      ),
    },
    previous_totals: previousTotals,
    type_distribution: Array.from(typeDistributionMap.entries())
      .map(([incident_type, count]) => ({
        incident_type,
        label: getIncidentTypeLabel(incident_type),
        count,
      }))
      .sort((left, right) => right.count - left.count),
    department_summary: Array.from(departmentSummaryMap.values()).sort(
      (left, right) => right.incident_count - left.incident_count,
    ),
    trend,
  };
}
