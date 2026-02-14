import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  department_id: z.string().uuid(),
  storage_path: z.string().trim().min(1).max(1024),
  file_name: z.string().trim().min(1).max(255),
  file_size_bytes: z.number().int().positive().max(25 * 1024 * 1024),
  mime_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]),
  checksum: z.string().trim().min(1).max(255),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

const documentSelect =
  "id, title, description, department_id, uploaded_by, storage_path, file_name, file_size_bytes, mime_type, checksum, version, status, created_at, updated_at";

export async function listDocuments(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    search?: string | null;
    status?: string | null;
    department_id?: string | null;
  },
) {
  let query = supabase
    .from("documents")
    .select(documentSelect, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(params.from, params.to);

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,file_name.ilike.%${params.search}%`);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  return await query;
}

export async function createDocument(
  supabase: SupabaseClient,
  payload: CreateDocumentInput,
  userId: string,
) {
  return await supabase
    .from("documents")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      department_id: payload.department_id,
      uploaded_by: userId,
      storage_path: payload.storage_path,
      file_name: payload.file_name,
      file_size_bytes: payload.file_size_bytes,
      mime_type: payload.mime_type,
      checksum: payload.checksum,
      version: 1,
      status: "active",
    })
    .select(documentSelect)
    .single();
}

export async function getDocumentById(supabase: SupabaseClient, id: string) {
  return await supabase.from("documents").select(documentSelect).eq("id", id).single();
}

export async function softDeleteDocument(supabase: SupabaseClient, id: string) {
  return await supabase
    .from("documents")
    .update({ status: "deleted" })
    .eq("id", id)
    .select(documentSelect)
    .single();
}