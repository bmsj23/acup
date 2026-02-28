import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const createIncidentSchema = z.object({
  department_id: z.string().uuid(),
  date_of_reporting: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_of_incident: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_of_incident: z.string().regex(/^\d{2}:\d{2}$/),
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
  sbar_situation: z.string().trim().min(1).max(5000).optional(),
  sbar_background: z.string().trim().min(1).max(5000).optional(),
  sbar_assessment: z.string().trim().min(1).max(5000).optional(),
  sbar_recommendation: z.string().trim().min(1).max(5000).optional(),
  is_resolved: z.boolean().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;

const incidentSelect =
  "id, department_id, reported_by, date_of_reporting, date_of_incident, time_of_incident, sbar_situation, sbar_background, sbar_assessment, sbar_recommendation, announcement_id, file_name, file_storage_path, file_mime_type, file_size_bytes, is_resolved, created_at, updated_at, profiles!reported_by(full_name, role), departments!department_id(name, code)";

export async function listIncidents(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    is_resolved?: boolean | null;
    start_date?: string | null;
    end_date?: string | null;
    search?: string | null;
  },
) {
  let query = supabase
    .from("incidents")
    .select(incidentSelect, { count: "exact" })
    .order("date_of_incident", { ascending: false })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.is_resolved !== null && params.is_resolved !== undefined) {
    query = query.eq("is_resolved", params.is_resolved);
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
) {
  return await supabase
    .from("incidents")
    .select(incidentSelect)
    .eq("is_resolved", false)
    .order("date_of_incident", { ascending: false })
    .limit(limit);
}

export async function getIncidentCountForMonth(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  departmentId?: string | null,
) {
  let query = supabase
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .gte("date_of_incident", startDate)
    .lte("date_of_incident", endDate);

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  return await query;
}