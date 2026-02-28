"use client";

import { ArrowLeft, CalendarDays, Paperclip, Trash2 } from "lucide-react";
import FilePreviewInline from "@/components/ui/file-preview-inline";
import type { AnnouncementDetail as AnnouncementDetailType } from "./types";
import { formatPublisher, getPriorityBadge } from "./utils";

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
  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:cursor-pointer hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Announcements
      </button>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <p className="text-sm text-zinc-600">Loading announcement details...</p>
        </div>
      ) : announcement ? (
        <article className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <h1 className="font-serif text-2xl font-semibold text-zinc-900">
                  {announcement.title}
                </h1>
                <p className="text-sm font-medium text-zinc-600">
                  {formatPublisher(announcement.profiles)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getPriorityBadge(announcement.priority)}`}
                  >
                    {announcement.priority}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                    {announcement.is_system_wide ? "System-wide" : "Department"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(announcement.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(announcement.id)}
                disabled={actionBusyId === announcement.id}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:cursor-pointer hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {actionBusyId === announcement.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {announcement.content}
              </p>
            </div>
          </div>

          {announcement.memo_file_name ? (
            <div className="border-t border-zinc-100 p-6">
              <p className="mb-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <Paperclip className="h-3.5 w-3.5" />
                Memo Attachment
              </p>
              <FilePreviewInline
                fileUrl={`/api/announcements/${announcement.id}/memo?inline=true`}
                downloadUrl={`/api/announcements/${announcement.id}/memo`}
                title={announcement.memo_file_name}
                mimeType={announcement.memo_mime_type ?? undefined}
              />
            </div>
          ) : null}

          {announcement.expires_at ? (
            <div className="border-t border-zinc-100 px-6 py-4">
              <p className="text-xs text-zinc-500">
                Expires: {new Date(announcement.expires_at).toLocaleString()}
              </p>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
          <p className="text-sm text-zinc-600">Announcement not found.</p>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      ) : null}
    </div>
  );
}