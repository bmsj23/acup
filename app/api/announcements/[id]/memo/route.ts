import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getAnnouncementById } from "@/lib/data/announcements";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid announcement id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: announcement, error: announcementError } = await getAnnouncementById(supabase, id);

  if (announcementError || !announcement) {
    if (announcementError?.code === "PGRST116") {
      return NextResponse.json(
        { error: "Announcement not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (announcementError?.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch announcement", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  if (!announcement.memo_storage_path || !announcement.memo_file_name || !announcement.memo_mime_type) {
    return NextResponse.json(
      { error: "Memo attachment not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from("announcement-memos")
    .createSignedUrl(announcement.memo_storage_path, 60);

  if (signedError || !signedData?.signedUrl) {
    if (signedError?.statusCode === "403" || signedError?.statusCode === "401") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch memo attachment", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const fileResponse = await fetch(signedData.signedUrl, { cache: "no-store" });

  if (!fileResponse.ok) {
    if (fileResponse.status === 401 || fileResponse.status === 403) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch memo attachment", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const bytes = await fileResponse.arrayBuffer();
  const encodedName = encodeURIComponent(announcement.memo_file_name);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": announcement.memo_mime_type,
      "Content-Disposition": `attachment; filename="${encodedName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}