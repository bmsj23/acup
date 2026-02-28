import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { writeAuditLog } from "@/lib/data/audit";
import {
  createMessage,
  createMessageSchema,
  listMessagesByThread,
} from "@/lib/data/messaging";

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
  const threadId = searchParams.get("thread_id");

  if (!threadId || !isValidUuid(threadId)) {
    return NextResponse.json(
      { error: "Invalid thread id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const limitParam = Math.min(Number(searchParams.get("limit")) || 50, 250);
  const before = searchParams.get("before") ?? undefined;

  const { data, error, count } = await listMessagesByThread(supabase, threadId, {
    limit: limitParam,
    before,
  });

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch messages", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const items = data ?? [];
  const hasMore = items.length === limitParam;

  return NextResponse.json({ data: items, meta: { count, has_more: hasMore } });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const parsed = createMessageSchema.safeParse(body);
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

  const { data, error } = await createMessage(supabase, parsed.data, user.id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to send message", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  await writeAuditLog(supabase, request, {
    table_name: "message_messages",
    record_id: data.id,
    action: "INSERT",
    new_data: data as Record<string, unknown>,
    performed_by: user.id,
  });

  return NextResponse.json({ data }, { status: 201 });
}
