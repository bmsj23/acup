import { notFound } from "next/navigation";
import PublicTrainingModuleClient from "@/components/training/public-training-module-client";
import TrainingPublicFooter from "@/components/training/training-public-footer";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{ qr_token: string }>;
};

export const revalidate = 600;

export default async function PublicTrainingPage({ params }: PageProps) {
  const { qr_token: qrToken } = await params;
  const admin = createAdminClient();

  const { data: module, error } = await admin
    .from("training_modules")
    .select("title, description, material_mime_type, material_file_name, published_at")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (error || !module || !module.published_at) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <PublicTrainingModuleClient
          qrToken={qrToken}
          title={module.title}
          description={module.description}
          materialMimeType={module.material_mime_type}
          materialFileName={module.material_file_name}
        />
        <TrainingPublicFooter returnTo={`/training/${qrToken}`} />
      </div>
    </main>
  );
}
