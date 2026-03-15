import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRAINING_BUCKET } from "@/lib/constants/training";

type RouteContext = {
  params: Promise<{ qr_token: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { qr_token: qrToken } = await context.params;
  const admin = createAdminClient();

  const { data: module, error } = await admin
    .from("training_modules")
    .select("title, description, material_storage_path, material_mime_type, material_file_name, published_at")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (error || !module || !module.published_at) {
    return NextResponse.json(
      { error: "Training material not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const { data: fileData, error: downloadError } = await admin.storage
    .from(TRAINING_BUCKET)
    .download(module.material_storage_path);

  if (downloadError || !fileData) {
    if (module.material_storage_path.startsWith("seed/demo/")) {
      const demoContent = [
        "ACUP demo training material",
        "",
        `Title: ${module.title}`,
        "",
        module.description,
        "",
        "This is seeded demo content so the public training route can be previewed before real files are uploaded.",
      ].join("\n");

      return new NextResponse(demoContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `inline; filename="${module.material_file_name}"`,
          "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to download training material", code: "STORAGE_ERROR" },
      { status: 500 },
    );
  }

  const arrayBuffer = await fileData.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": module.material_mime_type,
      "Content-Disposition": `inline; filename="${module.material_file_name}"`,
      "Content-Length": String(arrayBuffer.byteLength),
      "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
    },
  });
}
