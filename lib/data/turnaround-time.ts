import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { TurnaroundTimeSummaryResponse } from "@/types/monitoring";

const turnaroundTimeSelect = [
  "id",
  "department_id",
  "subdepartment_id",
  "service_name",
  "case_reference",
  "started_at",
  "completed_at",
  "notes",
  "recorded_by",
  "updated_by",
  "created_at",
  "updated_at",
  "departments!department_id(name, code)",
  "department_subdepartments!subdepartment_id(name, code)",
  "profiles!recorded_by(full_name, role)",
].join(", ");

function isCompletedBeforeStarted(startedAt: string, completedAt: string) {
  return new Date(completedAt).getTime() < new Date(startedAt).getTime();
}

function validateTurnaroundWindow(
  value: {
    started_at: string;
    completed_at: string;
  },
  ctx: z.RefinementCtx,
) {
  if (isCompletedBeforeStarted(value.started_at, value.completed_at)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "completed_at must be on or after started_at",
      path: ["completed_at"],
    });
  }
}

export const createTurnaroundTimeEntrySchema = z
  .object({
    department_id: z.string().uuid(),
    subdepartment_id: z.string().uuid().nullable().optional(),
    service_name: z.string().trim().min(1).max(255),
    case_reference: z.string().trim().min(1).max(255),
    started_at: z.string().datetime({ offset: true }),
    completed_at: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .superRefine(validateTurnaroundWindow);

export const updateTurnaroundTimeEntrySchema = z
  .object({
    department_id: z.string().uuid().optional(),
    subdepartment_id: z.string().uuid().nullable().optional(),
    service_name: z.string().trim().min(1).max(255).optional(),
    case_reference: z.string().trim().min(1).max(255).optional(),
    started_at: z.string().datetime({ offset: true }).optional(),
    completed_at: z.string().datetime({ offset: true }).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateTurnaroundTimeEntryInput = z.infer<typeof createTurnaroundTimeEntrySchema>;
export type UpdateTurnaroundTimeEntryInput = z.infer<typeof updateTurnaroundTimeEntrySchema>;

export function calculateTurnaroundDurationMinutes(startedAt: string, completedAt: string) {
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, Math.round(durationMs / 60_000));
}

export function validateTurnaroundTimeUpdateWindow(
  startedAt: string,
  completedAt: string,
) {
  return !isCompletedBeforeStarted(startedAt, completedAt);
}

export async function listTurnaroundTimeEntries(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    subdepartment_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    service?: string | null;
  },
) {
  let query = supabase
    .from("department_turnaround_time_entries")
    .select(turnaroundTimeSelect, { count: "exact" })
    .order("started_at", { ascending: false })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.subdepartment_id) {
    query = query.eq("subdepartment_id", params.subdepartment_id);
  }

  if (params.start_date) {
    query = query.gte("started_at", `${params.start_date}T00:00:00.000Z`);
  }

  if (params.end_date) {
    query = query.lte("started_at", `${params.end_date}T23:59:59.999Z`);
  }

  if (params.service) {
    query = query.ilike("service_name", `%${params.service}%`);
  }

  return await query;
}

export async function getTurnaroundTimeEntryById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("department_turnaround_time_entries")
    .select(turnaroundTimeSelect)
    .eq("id", id)
    .single();
}

export async function createTurnaroundTimeEntry(
  supabase: SupabaseClient,
  payload: CreateTurnaroundTimeEntryInput,
  userId: string,
) {
  return await supabase
    .from("department_turnaround_time_entries")
    .insert({
      department_id: payload.department_id,
      subdepartment_id: payload.subdepartment_id ?? null,
      service_name: payload.service_name,
      case_reference: payload.case_reference,
      started_at: payload.started_at,
      completed_at: payload.completed_at,
      notes: payload.notes ?? null,
      recorded_by: userId,
      updated_by: userId,
    })
    .select(turnaroundTimeSelect)
    .single();
}

export async function updateTurnaroundTimeEntryById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateTurnaroundTimeEntryInput,
  userId: string,
) {
  return await supabase
    .from("department_turnaround_time_entries")
    .update({
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.subdepartment_id !== undefined
        ? { subdepartment_id: payload.subdepartment_id }
        : {}),
      ...(payload.service_name !== undefined ? { service_name: payload.service_name } : {}),
      ...(payload.case_reference !== undefined
        ? { case_reference: payload.case_reference }
        : {}),
      ...(payload.started_at !== undefined ? { started_at: payload.started_at } : {}),
      ...(payload.completed_at !== undefined ? { completed_at: payload.completed_at } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      updated_by: userId,
    })
    .eq("id", id)
    .select(turnaroundTimeSelect)
    .single();
}

export async function deleteTurnaroundTimeEntryById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("department_turnaround_time_entries")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function buildTurnaroundTimeSummary(
  supabase: SupabaseClient,
  params: {
    startDate: string;
    endDate: string;
    departmentId?: string | null;
    subdepartmentId?: string | null;
    service?: string | null;
  },
): Promise<Omit<TurnaroundTimeSummaryResponse, "filters" | "role_scope">> {
  let query = supabase
    .from("department_turnaround_time_entries")
    .select(
      "id, department_id, service_name, started_at, completed_at, departments!department_id(name, code)",
    )
    .gte("started_at", `${params.startDate}T00:00:00.000Z`)
    .lte("started_at", `${params.endDate}T23:59:59.999Z`)
    .order("started_at", { ascending: false });

  if (params.departmentId) {
    query = query.eq("department_id", params.departmentId);
  }

  if (params.subdepartmentId) {
    query = query.eq("subdepartment_id", params.subdepartmentId);
  }

  if (params.service) {
    query = query.ilike("service_name", `%${params.service}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{
    department_id: string;
    service_name: string;
    started_at: string;
    completed_at: string;
  }>;

  const durations = rows
    .map((row) => calculateTurnaroundDurationMinutes(row.started_at, row.completed_at))
    .sort((left, right) => left - right);

  const services = new Map<string, { totalMinutes: number; entryCount: number }>();

  for (const row of rows) {
    const duration = calculateTurnaroundDurationMinutes(row.started_at, row.completed_at);
    const current = services.get(row.service_name) ?? { totalMinutes: 0, entryCount: 0 };
    current.totalMinutes += duration;
    current.entryCount += 1;
    services.set(row.service_name, current);
  }

  const entryCount = durations.length;
  const averageMinutes =
    entryCount > 0
      ? Number((durations.reduce((sum, value) => sum + value, 0) / entryCount).toFixed(1))
      : 0;
  const medianMinutes =
    entryCount === 0
      ? 0
      : entryCount % 2 === 1
        ? durations[Math.floor(entryCount / 2)] ?? 0
        : Number(
            (
              ((durations[entryCount / 2 - 1] ?? 0) + (durations[entryCount / 2] ?? 0))
              / 2
            ).toFixed(1),
          );
  const longestMinutes = entryCount > 0 ? durations[durations.length - 1] ?? 0 : 0;

  return {
    totals: {
      entry_count: entryCount,
      average_minutes: averageMinutes,
      median_minutes: medianMinutes,
      longest_minutes: longestMinutes,
    },
    services: Array.from(services.entries())
      .map(([service_name, value]) => ({
        service_name,
        entry_count: value.entryCount,
        average_minutes: Number((value.totalMinutes / value.entryCount).toFixed(1)),
      }))
      .sort((left, right) => right.entry_count - left.entry_count),
  };
}
