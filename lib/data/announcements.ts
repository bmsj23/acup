import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    content: z.string().trim().min(1).max(10000),
    priority: z.enum(["normal", "urgent", "critical"]).default("normal"),
    department_id: z.string().uuid().nullable().optional(),
    is_system_wide: z.boolean(),
    expires_at: z.string().datetime({ offset: true }).nullable().optional(),
    memo_file_name: z.string().trim().min(1).max(255).nullable().optional(),
    memo_storage_path: z.string().trim().min(1).max(1024).nullable().optional(),
    memo_mime_type: z.string().trim().min(1).max(255).nullable().optional(),
    memo_file_size_bytes: z.number().int().positive().max(25 * 1024 * 1024).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.is_system_wide && value.department_id) {
      ctx.addIssue({
        code: "custom",
        path: ["department_id"],
        message: "department_id must be null for system-wide announcements",
      });
    }

    if (!value.is_system_wide && !value.department_id) {
      ctx.addIssue({
        code: "custom",
        path: ["department_id"],
        message: "department_id is required for department-scoped announcements",
      });
    }

    const memoValues = [
      value.memo_file_name,
      value.memo_storage_path,
      value.memo_mime_type,
      value.memo_file_size_bytes,
    ];
    const providedMemoFieldCount = memoValues.filter((item) => item !== null && item !== undefined).length;

    if (providedMemoFieldCount > 0 && providedMemoFieldCount < 4) {
      ctx.addIssue({
        code: "custom",
        path: ["memo_file_name"],
        message: "memo attachment fields must be provided together",
      });
    }
  });

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    content: z.string().trim().min(1).max(10000).optional(),
    priority: z.enum(["normal", "urgent", "critical"]).optional(),
    department_id: z.string().uuid().nullable().optional(),
    is_system_wide: z.boolean().optional(),
    expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.is_system_wide === true && value.department_id) {
      ctx.addIssue({
        code: "custom",
        path: ["department_id"],
        message: "department_id must be null for system-wide announcements",
      });
    }
  });

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

const announcementSelect =
  "id, title, content, priority, department_id, created_by, is_system_wide, expires_at, memo_file_name, memo_storage_path, memo_mime_type, memo_file_size_bytes, created_at, updated_at, profiles!created_by(full_name, role, department_memberships(departments(code)))";

export async function listAnnouncements(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    search?: string | null;
    priority?: string | null;
    department_id?: string | null;
    is_system_wide?: boolean | null;
  },
) {
  let query = supabase
    .from("announcements")
    .select(announcementSelect, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(params.from, params.to);

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`);
  }

  if (params.priority) {
    query = query.eq("priority", params.priority);
  }

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.is_system_wide !== null && params.is_system_wide !== undefined) {
    query = query.eq("is_system_wide", params.is_system_wide);
  }

  return await query;
}

export async function createAnnouncement(
  supabase: SupabaseClient,
  payload: CreateAnnouncementInput,
  userId: string,
) {
  return await supabase
    .from("announcements")
    .insert({
      title: payload.title,
      content: payload.content,
      priority: payload.priority,
      department_id: payload.department_id ?? null,
      created_by: userId,
      is_system_wide: payload.is_system_wide,
      expires_at: payload.expires_at ?? null,
      memo_file_name: payload.memo_file_name ?? null,
      memo_storage_path: payload.memo_storage_path ?? null,
      memo_mime_type: payload.memo_mime_type ?? null,
      memo_file_size_bytes: payload.memo_file_size_bytes ?? null,
    })
    .select(announcementSelect)
    .single();
}

export async function getAnnouncementById(supabase: SupabaseClient, id: string) {
  return await supabase.from("announcements").select(announcementSelect).eq("id", id).single();
}

export async function updateAnnouncementById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateAnnouncementInput,
) {
  return await supabase
    .from("announcements")
    .update({
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.content !== undefined ? { content: payload.content } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.department_id !== undefined
        ? { department_id: payload.department_id }
        : {}),
      ...(payload.is_system_wide !== undefined
        ? { is_system_wide: payload.is_system_wide }
        : {}),
      ...(payload.expires_at !== undefined ? { expires_at: payload.expires_at } : {}),
    })
    .eq("id", id)
    .select(announcementSelect)
    .single();
}

export async function deleteAnnouncementById(supabase: SupabaseClient, id: string) {
  return await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}