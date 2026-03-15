import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { getRoleScope, isLeadershipRole } from "@/lib/data/monitoring";
import {
  createTrainingModule,
  createTrainingModuleSchema,
  listTrainingModules,
} from "@/lib/data/training";
import {
  TRAINING_ACCEPT_ATTRIBUTE,
  TRAINING_ALLOWED_MIME_TYPES,
  TRAINING_BUCKET,
  TRAINING_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/training";
import { sanitizeFileName } from "@/lib/utils/sanitize";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { role, memberDepartmentIds, error: scopeError } = await getRoleScope(supabase, user.id);
  if (scopeError || !role) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = getPagination(searchParams);
  const departmentId = searchParams.get("department_id");
  const search = searchParams.get("search");

  if (departmentId && !isValidUuid(departmentId)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (
    role === "department_head"
    && departmentId
    && !memberDepartmentIds.includes(departmentId)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data, error, count } = await listTrainingModules(supabase, {
    from,
    to,
    department_id:
      role === "department_head" && !departmentId
        ? memberDepartmentIds[0] ?? null
        : departmentId,
    search,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch training modules", code: "INTERNAL_ERROR" },
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

  const { role, memberDepartmentIds, primaryDepartmentId, error: scopeError } =
    await getRoleScope(supabase, user.id);
  if (scopeError || !role) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
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

  if (!file) {
    return NextResponse.json(
      { error: `A material file is required (${TRAINING_ACCEPT_ATTRIBUTE})`, code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (!TRAINING_ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: ${TRAINING_ACCEPT_ATTRIBUTE}`, code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (file.size > TRAINING_MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Training material exceeds the 250MB limit", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const requestedDepartmentId = form.get("department_id")?.toString().trim() || null;
  const requestedSystemWide = form.get("is_system_wide")?.toString() === "true";
  const departmentId =
    role === "department_head"
      ? requestedDepartmentId || primaryDepartmentId
      : requestedDepartmentId;
  const isSystemWide = isLeadershipRole(role) ? requestedSystemWide : false;

  if (
    departmentId
    && role === "department_head"
    && !memberDepartmentIds.includes(departmentId)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const safeName = sanitizeFileName(file.name || "training-material");
  const storagePath = `${user.id}/${randomUUID()}-${safeName}`;
  const publishNow = form.get("publish_now")?.toString() === "true";
  const explicitPublishedAt = form.get("published_at")?.toString().trim() || null;
  const qrToken = randomBytes(18).toString("base64url");

  const parsed = createTrainingModuleSchema.safeParse({
    title: form.get("title")?.toString().trim() || undefined,
    description: form.get("description")?.toString().trim() || undefined,
    department_id: isSystemWide ? null : departmentId,
    is_system_wide: isSystemWide,
    material_file_name: safeName,
    material_storage_path: storagePath,
    material_mime_type: file.type,
    material_size_bytes: file.size,
    qr_token: qrToken,
    published_at: explicitPublishedAt || (publishNow ? new Date().toISOString() : null),
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

  const { data: createdModule, error } = await createTrainingModule(supabase, parsed.data, user.id);
  if (error || !createdModule) {
    if (error?.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create training module", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
  const data = createdModule as unknown as { id: string };

  const admin = createAdminClient();
  const uploadResult = await admin.storage
    .from(TRAINING_BUCKET)
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadResult.error) {
    await supabase.from("training_modules").delete().eq("id", data.id);

    return NextResponse.json(
      {
        error: "Failed to upload training material",
        code: "STORAGE_UPLOAD_FAILED",
        details: uploadResult.error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
