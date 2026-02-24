import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const createMessageThreadSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    body: z.string().trim().min(1).max(4000),
    is_system_wide: z.boolean(),
    department_id: z.string().uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.is_system_wide && value.department_id) {
      ctx.addIssue({
        code: "custom",
        path: ["department_id"],
        message: "department_id must be null for system-wide threads",
      });
    }

    if (!value.is_system_wide && !value.department_id) {
      ctx.addIssue({
        code: "custom",
        path: ["department_id"],
        message: "department_id is required for department-scoped threads",
      });
    }
  });

export const createMessageSchema = z.object({
  thread_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const markThreadReadSchema = z.object({
  thread_id: z.string().uuid(),
});

const messageThreadSelect =
  "id, title, department_id, is_system_wide, created_by, created_at, updated_at";

const messageSelect =
  "id, thread_id, sender_id, body, created_at, profiles:sender_id(full_name,email)";

export async function listMessageThreads(
  supabase: SupabaseClient,
  params: { limit?: number; offset?: number } = {},
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  return await supabase
    .from("message_threads")
    .select(messageThreadSelect, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function createMessageThread(
  supabase: SupabaseClient,
  payload: z.infer<typeof createMessageThreadSchema>,
  userId: string,
) {
  const { data: thread, error: threadError } = await supabase
    .from("message_threads")
    .insert({
      title: payload.title,
      department_id: payload.department_id ?? null,
      is_system_wide: payload.is_system_wide,
      created_by: userId,
    })
    .select(messageThreadSelect)
    .single();

  if (threadError || !thread) {
    return { data: null, error: threadError };
  }

  const { error: messageError } = await supabase.from("message_messages").insert({
    thread_id: thread.id,
    sender_id: userId,
    body: payload.body,
  });

  if (messageError) {
    await supabase
      .from("message_threads")
      .delete()
      .eq("id", thread.id)
      .eq("created_by", userId);

    return { data: null, error: messageError };
  }

  return { data: thread, error: null };
}

export async function listMessagesByThread(
  supabase: SupabaseClient,
  threadId: string,
  params: { limit?: number; before?: string } = {},
) {
  const limit = params.limit ?? 50;
  let query = supabase
    .from("message_messages")
    .select(messageSelect, { count: "exact" })
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (params.before) {
    query = query.lt("created_at", params.before);
  }

  return await query;
}

export async function createMessage(
  supabase: SupabaseClient,
  payload: z.infer<typeof createMessageSchema>,
  userId: string,
) {
  return await supabase
    .from("message_messages")
    .insert({
      thread_id: payload.thread_id,
      sender_id: userId,
      body: payload.body,
    })
    .select(messageSelect)
    .single();
}

export async function markThreadAsRead(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
) {
  return await supabase
    .from("message_thread_reads")
    .upsert(
      {
        user_id: userId,
        thread_id: threadId,
        last_read_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,thread_id",
      },
    )
    .select("user_id, thread_id, last_read_at")
    .single();
}
