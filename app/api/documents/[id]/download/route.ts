import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getDocumentById } from "@/lib/data/documents";
import { applyPdfWatermark } from "@/lib/utils/watermark";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid document id", code: "VALIDATION_ERROR" },
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

  const { data: document, error: documentError } = await getDocumentById(supabase, id);

  if (documentError || !document) {
    if (documentError?.code === "PGRST116") {
      return NextResponse.json(
        { error: "Document not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch document", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  if (document.mime_type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF download is supported", code: "UNSUPPORTED_MEDIA_TYPE" },
      { status: 415 },
    );
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storage_path, 60);

  if (signedError || !signedData?.signedUrl) {
    if (signedError?.statusCode === "403" || signedError?.statusCode === "401") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch document file", code: "INTERNAL_ERROR" },
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
      { error: "Failed to fetch document file", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const sourceBytes = new Uint8Array(await fileResponse.arrayBuffer());
  const watermarkedBytes = await applyPdfWatermark(sourceBytes, {
    userEmail: user.email ?? "unknown",
    documentId: document.id,
    timestampIso: new Date().toISOString(),
  });
  const responseBytes = new Uint8Array(watermarkedBytes);

  const encodedName = encodeURIComponent(document.file_name);

  return new Response(responseBytes.buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="watermarked-${encodedName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}