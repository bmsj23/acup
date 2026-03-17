"use client";

import {
  ArrowLeft,
  Globe2,
  Paperclip,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import FilePreviewInline from "@/components/ui/file-preview-inline";
import { APP_BRAND } from "@/lib/constants/brand";
import type { AnnouncementDetail as AnnouncementDetailType } from "./types";
import { formatAnnouncementScope, formatPublisher, getPriorityBadge } from "./utils";

type AnnouncementDetailProps = {
  announcement: AnnouncementDetailType | null;
  loading: boolean;
  error: string | null;
  actionBusyId: string | null;
  onDelete: (id: string) => void;
  onBack: () => void;
};

export default function AnnouncementDetail({
  announcement,
  loading,
  error,
  actionBusyId,
  onDelete,
  onBack,
}: AnnouncementDetailProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-44 animate-pulse rounded-full bg-blue-100/80" />
        <div className="animate-pulse space-y-6 rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] p-6 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
          <div className="rounded-[1.8rem] border border-blue-100/80 bg-white/90 px-6 py-7">
            <div className="h-8 w-32 rounded-full bg-blue-100/80" />
            <div className="mt-5 h-12 w-3/4 rounded-[1rem] bg-blue-100/70" />
            <div className="mt-4 h-4 w-48 rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-36 rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_20rem]">
            <div className="space-y-6">
              <div className="h-64 rounded-[1.8rem] border border-blue-100/80 bg-white/90" />
              <div className="h-56 rounded-[1.8rem] border border-blue-100/80 bg-white/90" />
            </div>
            <div className="space-y-4">
              <div className="h-56 rounded-[1.8rem] border border-blue-100/80 bg-white/90" />
              <div className="h-40 rounded-[1.8rem] border border-blue-100/80 bg-white/90" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.55)] backdrop-blur-sm transition-all hover:cursor-pointer hover:border-slate-200 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to announcements
        </button>
        <div className="rounded-[2rem] border border-blue-100/80 bg-white/95 p-12 text-center shadow-[0_32px_90px_-48px_rgba(30,64,175,0.14)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Announcement briefing
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 [font-family:var(--font-playfair)]">
            Announcement not found
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            The selected announcement could not be loaded or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const isCritical = announcement.priority === "critical";
  const scopeLabel = formatAnnouncementScope(announcement);

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-5 -z-10 h-[26rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(245,249,255,0.72),rgba(255,255,255,0))]" />

      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.55)] backdrop-blur-sm transition-all hover:cursor-pointer hover:border-slate-200 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to announcements
      </button>

      <article className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
        <div className="relative overflow-hidden border-b border-blue-100/80 px-6 py-7 md:px-8 md:py-8">
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 ${
              isCritical
                ? "bg-[linear-gradient(90deg,rgba(220,38,38,0.95),rgba(37,99,235,0.85))]"
                : "bg-[linear-gradient(90deg,rgba(30,64,175,0.95),rgba(96,165,250,0.85))]"
            }`}
          />

          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${getPriorityBadge(announcement.priority)}`}
                >
                  {isCritical ? <TriangleAlert className="h-4 w-4" /> : null}
                  {announcement.priority}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                  <Globe2 className="h-4 w-4" />
                  {scopeLabel}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  {APP_BRAND.shortName} operational communication
                </p>
                <h1 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-tight text-slate-950 [font-family:var(--font-playfair)]">
                  {announcement.title}
                </h1>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Published by
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatPublisher(announcement.profiles)}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Published
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {new Date(announcement.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Memo record
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {announcement.memo_file_name ? "Attached to briefing" : "No memo attached"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col">
              <button
                type="button"
                onClick={() => onDelete(announcement.id)}
                disabled={actionBusyId === announcement.id}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white/90 px-5 py-3.5 text-sm font-semibold text-red-700 transition-colors hover:cursor-pointer hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {actionBusyId === announcement.id ? "Deleting..." : "Delete announcement"}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 md:px-8">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Official message
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                  Announcement content
                </h2>
              </div>

              <div className="px-6 py-6">
                <div className="rounded-[1.5rem] border border-blue-100/80 bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(30,64,175,0.14)]">
                  <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700">
                    {announcement.content}
                  </p>
                </div>
              </div>
            </section>

            {announcement.memo_file_name ? (
              <section className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-6 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Attached memo
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                      Supporting briefing record
                    </h2>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <Paperclip className="h-5 w-5" />
                  </span>
                </div>

                <FilePreviewInline
                  fileUrl={`/api/announcements/${announcement.id}/memo?inline=true`}
                  downloadUrl={`/api/announcements/${announcement.id}/memo`}
                  title={announcement.memo_file_name}
                  mimeType={announcement.memo_mime_type ?? undefined}
                />
              </section>
            ) : null}
          </div>
        </div>
      </article>

      {error ? (
        <div className="rounded-[1.3rem] border border-red-100 bg-red-50/70 p-4 shadow-[0_16px_32px_-26px_rgba(220,38,38,0.16)]">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
