import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, QrCode } from "lucide-react";
import { internalApiFetch } from "@/app/actions/internal-api";
import TrainingModuleDetailActions from "@/components/training/training-module-detail-actions";
import WorkspacePanel from "@/components/workspace/workspace-panel";
import { buildBrandTitle } from "@/lib/constants/brand";
import type { TrainingModuleItem } from "@/types/monitoring";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ModuleRouteResponse = {
  data?: TrainingModuleItem;
};

async function getModuleItem(id: string) {
  const result = await internalApiFetch(`/api/training/modules/${id}`);

  if (!result.ok) {
    return null;
  }

  return ((result.data as ModuleRouteResponse | null)?.data ?? null) as TrainingModuleItem | null;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const moduleItem = await getModuleItem(id);

  return {
    title: buildBrandTitle(moduleItem ? moduleItem.title : "Training Module"),
  };
}

export default async function TrainingModuleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const moduleItem = await getModuleItem(id);

  if (!moduleItem) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/training/modules"
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to module library
      </Link>

      <section className="rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(145deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] px-6 py-7 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.2)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Training module
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(2rem,3.5vw,2.8rem)] font-semibold leading-[0.98] text-slate-950 [font-family:var(--font-playfair)]">
              {moduleItem.title}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              {moduleItem.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full bg-white px-3 py-1 text-slate-600">
              {moduleItem.is_system_wide ? "System-wide" : moduleItem.departments?.name ?? "Department"}
            </span>
            <span
              className={`rounded-full px-3 py-1 ${
                moduleItem.published_at ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {moduleItem.published_at ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_20rem]">
        <WorkspacePanel className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-blue-100/80 bg-white/90 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Material
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">{moduleItem.material_file_name}</p>
              <p className="mt-1 text-sm text-slate-600">{moduleItem.material_mime_type}</p>
            </div>
            <div className="rounded-[1.4rem] border border-blue-100/80 bg-white/90 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Published
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {moduleItem.published_at ? new Date(moduleItem.published_at).toLocaleString() : "Draft only"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Created {new Date(moduleItem.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-blue-100/80 bg-blue-50/55 p-5">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
              <FileText className="h-4 w-4" />
              Module summary
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Use this page for file access, QR review, and public-share checks without crowding the library view.
            </p>
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="p-5">
          <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            <QrCode className="h-4 w-4" />
            Access
          </div>
          {moduleItem.published_at ? (
            <>
              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-4">
                <Image
                  src={`/api/training/modules/${moduleItem.id}/qr`}
                  alt={`QR code for ${moduleItem.title}`}
                  width={224}
                  height={224}
                  className="mx-auto rounded-2xl bg-white p-3 shadow-sm"
                  unoptimized
                />
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                QR access opens the published material together with the legal footer for public learners.
              </p>
            </>
          ) : (
            <div className="mt-4 rounded-[1.4rem] border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm leading-6 text-amber-700">
              Publish this module first before sharing the public learner route or QR code.
            </div>
          )}

          <div className="mt-5">
            <TrainingModuleDetailActions
              moduleId={moduleItem.id}
              qrToken={moduleItem.qr_token}
              publishedAt={moduleItem.published_at}
            />
          </div>
        </WorkspacePanel>
      </section>
    </div>
  );
}
