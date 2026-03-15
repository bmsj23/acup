import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, PlayCircle } from "lucide-react";
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

  const materialUrl = `/api/training/public/${qrToken}`;
  const isPdf = module.material_mime_type === "application/pdf";
  const isVideo = module.material_mime_type.startsWith("video/");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to ACUP
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-white/95 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
          <div className="border-b border-blue-100/80 px-6 py-6 md:px-8">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Training Material
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4.5vw,3.4rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)]">
              {module.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{module.description}</p>
          </div>

          <div className="px-6 py-6 md:px-8">
            {isPdf ? (
              <iframe
                src={materialUrl}
                className="h-[75vh] w-full rounded-[1.5rem] border border-blue-100/80 bg-white"
                title={module.title}
              />
            ) : null}

            {isVideo ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-slate-950">
                <video
                  className="h-auto w-full"
                  controls
                  preload="metadata"
                  src={materialUrl}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : null}

            {!isPdf && !isVideo ? (
              <div className="rounded-[1.5rem] border border-dashed border-blue-100/80 bg-blue-50/70 px-6 py-10 text-center">
                <PlayCircle className="mx-auto h-10 w-10 text-blue-700" />
                <p className="mt-4 text-sm text-slate-600">
                  This file type opens best in its native app. Use the download button below to view the material.
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={materialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
              >
                <Download className="h-4 w-4" />
                Open material
              </a>
              <a
                href={materialUrl}
                download={module.material_file_name}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
