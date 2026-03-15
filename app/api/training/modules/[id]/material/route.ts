import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getTrainingModuleById } from "@/lib/data/training";
import { TRAINING_BUCKET } from "@/lib/constants/training";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TrainingMaterialShape = {
  title: string;
  description: string;
  material_storage_path: string;
  material_mime_type: string;
  material_file_name: string;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid training module id", code: "VALIDATION_ERROR" },
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

  const { data: moduleRaw, error } = await getTrainingModuleById(supabase, id);
  if (error || !moduleRaw) {
    return NextResponse.json(
      { error: "Training module not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const trainingModule = moduleRaw as unknown as TrainingMaterialShape;

  const admin = createAdminClient();
  const { data: fileData, error: downloadError } = await admin.storage
    .from(TRAINING_BUCKET)
    .download(trainingModule.material_storage_path);

  if (downloadError || !fileData) {
    if (trainingModule.material_storage_path.startsWith("seed/demo/")) {
      const demoContent = [
        "ACUP demo training material",
        "",
        `Title: ${trainingModule.title}`,
        "",
        trainingModule.description,
        "",
        "This is seeded demo content so the training module can be previewed before real files are uploaded.",
      ].join("\n");

      return new NextResponse(demoContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `inline; filename="${trainingModule.material_file_name}"`,
          "Cache-Control": "private, max-age=3600",
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
      "Content-Type": trainingModule.material_mime_type,
      "Content-Disposition": `inline; filename="${trainingModule.material_file_name}"`,
      "Content-Length": String(arrayBuffer.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
