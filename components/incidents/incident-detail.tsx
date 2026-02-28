"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import type { IncidentItem } from "./types";
import SbarSection from "./sbar-section";
import AttachmentPreview from "./attachment-preview";

type IncidentDetailProps = {
  incident: IncidentItem | null;
  loading: boolean;
  actionBusyId: string | null;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
};

export default function IncidentDetail({
  incident,
  loading,
  actionBusyId,
  onResolve,
  onDelete,
  onBack,
}: IncidentDetailProps) {
  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:cursor-pointer hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Incidents
      </button>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white py-20 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-600">Loading incident details...</p>
        </div>
      ) : incident ? (
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {/* header band */}
          <div
            className={`px-6 py-5 ${
              incident.is_resolved
                ? "border-b-2 border-b-emerald-400 bg-emerald-50/40"
                : "border-b-2 border-b-red-400 bg-red-50/40"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="font-serif text-2xl font-semibold text-zinc-900">
                      Incident Report
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-600">
                      Reported by{" "}
                      <span className="font-semibold text-zinc-800">
                        {incident.departments?.name ?? "Unknown Department"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      incident.is_resolved
                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-red-100 text-red-700 ring-1 ring-red-200"
                    }`}
                  >
                    {incident.is_resolved ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {incident.is_resolved ? "Resolved" : "Unresolved"}
                  </span>
                  <div className="h-4 w-px bg-zinc-300" />
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
                    Incident: {incident.date_of_incident} at{" "}
                    {incident.time_of_incident}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    Reported: {incident.date_of_reporting}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!incident.is_resolved && (
                  <button
                    type="button"
                    onClick={() => onResolve(incident.id)}
                    disabled={actionBusyId === incident.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:cursor-pointer hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Resolved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(incident.id)}
                  disabled={actionBusyId === incident.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:cursor-pointer hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* sbar section */}
          <div className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                SBAR Assessment
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <SbarSection label="Situation" text={incident.sbar_situation} color="primary" />
              <SbarSection label="Background" text={incident.sbar_background} color="secondary" />
              <SbarSection label="Assessment" text={incident.sbar_assessment} color="neutral" />
              <SbarSection label="Recommendation" text={incident.sbar_recommendation} color="neutral" />
            </div>
          </div>

          {/* attachment section */}
          {incident.file_name && (
            <div className="border-t border-zinc-100 p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Attachment
                </h2>
              </div>
              <AttachmentPreview
                incidentId={incident.id}
                fileName={incident.file_name}
                mimeType={incident.file_mime_type}
                fileSize={incident.file_size_bytes}
              />
            </div>
          )}

          {/* linked announcement */}
          {incident.announcement_id && (
            <div className="border-t border-zinc-100 p-6">
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                  Linked Announcement
                </p>
                <a
                  href={`/announcements/${incident.announcement_id}`}
                  className="text-sm font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:cursor-pointer hover:text-blue-900"
                >
                  View announcement created for this incident
                </a>
              </div>
            </div>
          )}
        </article>
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white py-20 shadow-sm">
          <p className="text-sm text-zinc-600">Incident not found.</p>
        </div>
      )}
    </div>
  );
}