import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getIncidentById } from "@/lib/data/incidents";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: incident, error } = await getIncidentById(supabase, id);

  if (error || !incident) {
    return NextResponse.json(
      { error: "Incident not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!incident.file_storage_path) {
    return NextResponse.json(
      { error: "No file attached to this incident", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("incident-files")
    .download(incident.file_storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: "Failed to download file", code: "STORAGE_ERROR" },
      { status: 500 },
    );
  }

  const arrayBuffer = await fileData.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": incident.file_mime_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${incident.file_name || "attachment"}"`,
      "Content-Length": String(arrayBuffer.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}