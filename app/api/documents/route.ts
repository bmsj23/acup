import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import {
  createDocument,
  createDocumentSchema,
  listDocuments,
} from "@/lib/data/documents";
import { createPagination, getPagination } from "@/lib/data/pagination";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 255);
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
  const statusFilter = searchParams.get("status");
  const departmentIdFilter = searchParams.get("department_id");

  const { data, error, count } = await listDocuments(supabase, {
    from,
    to,
    search: searchFilter,
    status: statusFilter,
    department_id: departmentIdFilter,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents", code: "INTERNAL_ERROR" },
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

    const fileEntry = form.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "file is required", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(fileEntry.type)) {
      return NextResponse.json(
        { error: "Unsupported file type", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (fileEntry.size <= 0 || fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 25MB limit", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const departmentId = form.get("department_id");
    const title = form.get("title");
    const description = form.get("description");

    if (typeof departmentId !== "string" || typeof title !== "string") {
      return NextResponse.json(
        {
          error: "department_id and title are required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(fileEntry.name || "upload-file");
    const storagePath = `${departmentId}/${user.id}/${randomUUID()}-${safeName}`;
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const checksum = createHash("sha256").update(fileBuffer).digest("hex");

    const parsed = createDocumentSchema.safeParse({
      title,
      description: typeof description === "string" ? description : null,
      department_id: departmentId,
      storage_path: storagePath,
      file_name: safeName,
      file_size_bytes: fileEntry.size,
      mime_type: fileEntry.type,
      checksum,
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
    const { data, error } = await createDocument(supabase, payload, user.id);

    if (error) {
      if (error.code === "42501") {
        return NextResponse.json(
          { error: "Forbidden", code: "FORBIDDEN" },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Failed to create document", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: fileEntry.type,
        upsert: false,
      });

    if (uploadResult.error) {
      await supabase
        .from("documents")
        .update({ status: "deleted" })
        .eq("id", data.id)
        .eq("uploaded_by", user.id);

      return NextResponse.json(
        {
          error: "Failed to upload file",
          code: "STORAGE_UPLOAD_FAILED",
          details: uploadResult.error.message,
        },
        { status: 500 },
      );
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

  const parsed = createDocumentSchema.safeParse(body);
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

  const { data, error } = await createDocument(supabase, payload, user.id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create document", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}