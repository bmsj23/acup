import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import {
  createMessageThread,
  createMessageThreadSchema,
  listMessageThreads,
} from "@/lib/data/messaging";

export async function GET() {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: threads, error: threadsError } = await listMessageThreads(supabase, 60);

  if (threadsError) {
    return NextResponse.json(
      { error: "Failed to fetch messaging threads", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const threadIds = (threads ?? []).map((item) => item.id);
  if (threadIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: latestMessages } = await supabase
    .from("message_messages")
    .select("thread_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })
    .limit(500);

  const latestByThread = new Map<string, { body: string; created_at: string }>();
  for (const message of latestMessages ?? []) {
    if (!latestByThread.has(message.thread_id)) {
      latestByThread.set(message.thread_id, {
        body: message.body,
        created_at: message.created_at,
      });
    }
  }

  const data = (threads ?? []).map((thread) => ({
    ...thread,
    latest_message_body: latestByThread.get(thread.id)?.body ?? null,
    latest_message_at: latestByThread.get(thread.id)?.created_at ?? null,
  }));

  return NextResponse.json({ data });
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

  const parsed = createMessageThreadSchema.safeParse(body);
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

  const { data, error } = await createMessageThread(supabase, parsed.data, user.id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create thread", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
