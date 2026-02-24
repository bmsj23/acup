import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { listMessageThreads } from "@/lib/data/messaging";

export async function GET() {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: threads, error: threadsError } = await listMessageThreads(supabase, { limit: 300 });

  if (threadsError) {
    return NextResponse.json(
      { error: "Failed to fetch messaging threads", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const threadIds = (threads ?? []).map((item) => item.id);

  if (threadIds.length === 0) {
    return NextResponse.json({
      data: {
        total_unread_threads: 0,
        unread_thread_ids: [],
      },
    });
  }

  const { data: readRows, error: readError } = await supabase
    .from("message_thread_reads")
    .select("thread_id, last_read_at")
    .eq("user_id", user.id)
    .in("thread_id", threadIds);

  if (readError) {
    return NextResponse.json(
      { error: "Failed to fetch read state", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const readMap = new Map<string, string>();
  for (const item of readRows ?? []) {
    readMap.set(item.thread_id, item.last_read_at);
  }

  const { data: messageRows, error: messageError } = await supabase
    .from("message_messages")
    .select("thread_id, sender_id, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (messageError) {
    return NextResponse.json(
      { error: "Failed to fetch messages", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const latestOtherMessageByThread = new Map<string, string>();

  for (const row of messageRows ?? []) {
    if (row.sender_id === user.id) {
      continue;
    }

    if (!latestOtherMessageByThread.has(row.thread_id)) {
      latestOtherMessageByThread.set(row.thread_id, row.created_at);
    }
  }

  const unreadThreadIds: string[] = [];
  let totalUnreadThreads = 0;

  for (const threadId of threadIds) {
    const latestOtherMessageAt = latestOtherMessageByThread.get(threadId);

    if (!latestOtherMessageAt) {
      continue;
    }

    const lastReadAt = readMap.get(threadId);
    const isUnread = !lastReadAt || new Date(latestOtherMessageAt).getTime() > new Date(lastReadAt).getTime();

    if (isUnread) {
      totalUnreadThreads += 1;
      unreadThreadIds.push(threadId);
    }
  }

  return NextResponse.json({
    data: {
      total_unread_threads: totalUnreadThreads,
      unread_thread_ids: unreadThreadIds,
    },
  });
}
