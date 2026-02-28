import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import {
  createIncident,
  createIncidentSchema,
  listIncidents,
  linkAnnouncementToIncident,
} from "@/lib/data/incidents";
import { createAnnouncement } from "@/lib/data/announcements";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { sanitizeFileName } from "@/lib/utils/sanitize";
import { writeAuditLog } from "@/lib/data/audit";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = getPagination(searchParams);
  const departmentIdFilter = searchParams.get("department_id");
  const resolvedFilter = searchParams.get("is_resolved");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const searchFilter = searchParams.get("search");

  const { data, error, count } = await listIncidents(supabase, {
    from,
    to,
    department_id: departmentIdFilter,
    is_resolved:
      resolvedFilter === "true"
        ? true
        : resolvedFilter === "false"
          ? false
          : null,
    start_date: startDate,
    end_date: endDate,
    search: searchFilter,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch incidents", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: createPagination(page, limit, count),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart payload", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const fileEntry = form.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  if (file) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, JPEG, PNG, WebP", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 25MB limit", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
  }

  const safeName = file ? sanitizeFileName(file.name || "attachment") : null;
  const storagePath = file && safeName ? `${user.id}/${randomUUID()}-${safeName}` : null;

  const parsed = createIncidentSchema.safeParse({
    department_id: form.get("department_id")?.toString().trim() || undefined,
    date_of_reporting: form.get("date_of_reporting")?.toString().trim() || undefined,
    date_of_incident: form.get("date_of_incident")?.toString().trim() || undefined,
    time_of_incident: form.get("time_of_incident")?.toString().trim() || undefined,
    sbar_situation: form.get("sbar_situation")?.toString().trim() || undefined,
    sbar_background: form.get("sbar_background")?.toString().trim() || undefined,
    sbar_assessment: form.get("sbar_assessment")?.toString().trim() || undefined,
    sbar_recommendation: form.get("sbar_recommendation")?.toString().trim() || undefined,
    file_name: safeName,
    file_storage_path: storagePath,
    file_mime_type: file?.type ?? null,
    file_size_bytes: file?.size ?? null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const { data, error } = await createIncident(supabase, payload, user.id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create incident", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  await writeAuditLog(supabase, request, {
    table_name: "incidents",
    record_id: data.id,
    action: "INSERT",
    new_data: data as Record<string, unknown>,
    performed_by: user.id,
  });

  if (file && storagePath) {
    const uploadResult = await supabase.storage
      .from("incident-files")
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      await supabase.from("incidents").delete().eq("id", data.id);

      return NextResponse.json(
        {
          error: "Failed to upload file attachment",
          code: "STORAGE_UPLOAD_FAILED",
          details: uploadResult.error.message,
        },
        { status: 500 },
      );
    }
  }

  const deptInfo = (data as Record<string, unknown>).departments as { name: string; code: string } | null;
  const deptName = deptInfo?.name ?? "Unknown Department";

  const { data: announcement, error: announcementError } = await createAnnouncement(
    supabase,
    {
      title: `Incident Report - ${deptName}`,
      content: `An incident has been reported on ${payload.date_of_incident}.\n\nSituation: ${payload.sbar_situation}`,
      priority: "urgent",
      department_id: null,
      is_system_wide: true,
    },
    user.id,
  );

  if (!announcementError && announcement) {
    await linkAnnouncementToIncident(supabase, data.id, announcement.id);
  }

  return NextResponse.json({ data }, { status: 201 });
}