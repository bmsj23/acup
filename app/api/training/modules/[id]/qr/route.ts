import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getTrainingModuleById } from "@/lib/data/training";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TrainingQrModuleShape = {
  title: string;
  qr_token: string;
  published_at: string | null;
};

export async function GET(request: Request, context: RouteContext) {
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

  const trainingModule = moduleRaw as unknown as TrainingQrModuleShape;
  if (!trainingModule.published_at) {
    return NextResponse.json(
      { error: "Training module is not published", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const { origin } = new URL(request.url);
  const accessUrl = `${origin}/training/${trainingModule.qr_token}`;
  const svg = await QRCode.toString(accessUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
    width: 256,
  });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": 'inline; filename="training-module-qr.svg"',
    },
  });
}
