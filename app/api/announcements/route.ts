import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import {
  createAnnouncement,
  createAnnouncementSchema,
  listAnnouncements,
} from "@/lib/data/announcements";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { sanitizeFileName } from "@/lib/utils/sanitize";
import { writeAuditLog } from "@/lib/data/audit";

const MAX_MEMO_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEMO_MIME_TYPES = new Set(["application/pdf"]);

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseIsSystemWide(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

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
  const searchFilter = searchParams.get("search");
  const priorityFilter = searchParams.get("priority");
  const departmentIdFilter = searchParams.get("department_id");
  const systemWideFilter = searchParams.get("is_system_wide");

  const { data, error, count } = await listAnnouncements(supabase, {
    from,
    to,
    search: searchFilter,
    priority: priorityFilter,
    department_id: departmentIdFilter,
    is_system_wide:
      systemWideFilter === "true"
        ? true
        : systemWideFilter === "false"
          ? false
          : null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch announcements", code: "INTERNAL_ERROR" },
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

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid multipart payload", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const memoFileEntry = form.get("memo_file");
    const memoFile = memoFileEntry instanceof File && memoFileEntry.size > 0 ? memoFileEntry : null;

    if (memoFile) {
      if (!ALLOWED_MEMO_MIME_TYPES.has(memoFile.type)) {
        return NextResponse.json(
          { error: "Memo must be a PDF file", code: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }

      if (memoFile.size > MAX_MEMO_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Memo file exceeds 25MB limit", code: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }
    }

    const isSystemWide = parseIsSystemWide(form.get("is_system_wide"));
    if (isSystemWide === null) {
      return NextResponse.json(
        { error: "is_system_wide is required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const safeName = memoFile ? sanitizeFileName(memoFile.name || "memo.pdf") : null;
    const memoStoragePath = memoFile && safeName ? `${user.id}/${randomUUID()}-${safeName}` : null;

    const parsed = createAnnouncementSchema.safeParse({
      title: normalizeOptionalString(form.get("title")),
      content: normalizeOptionalString(form.get("content")),
      priority: normalizeOptionalString(form.get("priority")) ?? "normal",
      department_id: isSystemWide ? null : (normalizeOptionalString(form.get("department_id")) ?? null),
      is_system_wide: isSystemWide,
      expires_at: normalizeOptionalString(form.get("expires_at")) ?? null,
      memo_file_name: safeName,
      memo_storage_path: memoStoragePath,
      memo_mime_type: memoFile?.type ?? null,
      memo_file_size_bytes: memoFile?.size ?? null,
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
    const { data, error } = await createAnnouncement(supabase, payload, user.id);

    if (error) {
      if (error.code === "42501") {
        return NextResponse.json(
          { error: "Forbidden", code: "FORBIDDEN" },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Failed to create announcement", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }

    await writeAuditLog(supabase, request, {
      table_name: "announcements",
      record_id: data.id,
      action: "INSERT",
      new_data: data as Record<string, unknown>,
      performed_by: user.id,
    });

    if (memoFile && memoStoragePath) {
      const uploadResult = await supabase.storage
        .from("announcement-memos")
        .upload(memoStoragePath, Buffer.from(await memoFile.arrayBuffer()), {
          contentType: memoFile.type,
          upsert: false,
        });

      if (uploadResult.error) {
        await supabase
          .from("announcements")
          .delete()
          .eq("id", data.id)
          .eq("created_by", user.id);

        return NextResponse.json(
          {
            error: "Failed to upload memo attachment",
            code: "STORAGE_UPLOAD_FAILED",
            details: uploadResult.error.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const parsed = createAnnouncementSchema.safeParse(body);
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

  const { data, error } = await createAnnouncement(supabase, payload, user.id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create announcement", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  await writeAuditLog(supabase, request, {
    table_name: "announcements",
    record_id: data.id,
    action: "INSERT",
    new_data: data as Record<string, unknown>,
    performed_by: user.id,
  });

  return NextResponse.json({ data }, { status: 201 });
}