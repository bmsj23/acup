"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  ShieldPlus,
  Stethoscope,
  Trash2,
  TriangleAlert,
  UserRound,
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

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateValue: string, timeValue: string) {
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) {
    return `${dateValue} ${timeValue}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRoleLabel(role?: string | null) {
  if (!role) {
    return "Clinical Staff";
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function DetailRailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.55)] backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          {icon}
        </span>
        {label}
      </div>
      <p className="text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

export default function IncidentDetail({
  incident,
  loading,
  actionBusyId,
  onResolve,
  onDelete,
  onBack,
}: IncidentDetailProps) {
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] p-6 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
        <div className="animate-pulse space-y-6">
          <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] px-6 py-7">
            <div className="h-8 w-40 rounded-full bg-blue-100/80" />
            <div className="mt-6 h-4 w-32 rounded-full bg-slate-100" />
            <div className="mt-3 h-12 w-3/4 rounded-[1rem] bg-blue-100/70" />
            <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-slate-100" />
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 rounded-[1.35rem] bg-white/90 shadow-[0_12px_30px_-28px_rgba(30,64,175,0.18)]" />
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_21rem]">
            <div className="space-y-6">
              <div className="rounded-[1.8rem] border border-blue-100/80 bg-white/95 p-6">
                <div className="h-4 w-32 rounded-full bg-slate-100" />
                <div className="mt-3 h-8 w-72 rounded-full bg-blue-100/80" />
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-40 rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.72),rgba(255,255,255,0.96))]" />
                  ))}
                </div>
              </div>
              <div className="h-52 rounded-[1.8rem] border border-blue-100/80 bg-white/95" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[1.8rem] border border-blue-100/80 bg-white/95 p-5">
                  <div className="h-4 w-28 rounded-full bg-slate-100" />
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: index === 0 ? 4 : 2 }).map((__, itemIndex) => (
                      <div key={itemIndex} className="h-20 rounded-[1.2rem] bg-blue-50/70" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="rounded-[2rem] border border-blue-100/80 bg-white/95 p-12 text-center shadow-[0_32px_90px_-48px_rgba(30,64,175,0.14)]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
          Incident Review
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900 [font-family:var(--font-playfair)]">
          Incident not found
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          The selected incident could not be loaded or is no longer available.
        </p>
      </div>
    );
  }

  const busy = actionBusyId === incident.id;
  const statusClasses = incident.is_resolved
    ? {
        banner:
          "border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.97))]",
        badge:
          "bg-blue-600 text-white shadow-[0_16px_30px_-22px_rgba(30,64,175,0.35)]",
        ring: "border-blue-100/80 text-blue-800 bg-blue-50/70",
        accent: "from-blue-700 to-blue-400",
        icon: <CheckCircle className="h-4 w-4" />,
        headline: "Resolved and documented",
        summary:
          "This incident has already been addressed. Review the final SBAR notes and attached record for closure details.",
      }
    : {
        banner:
          "border-blue-100/80 bg-[linear-gradient(180deg,rgba(246,248,255,0.98),rgba(255,255,255,0.97))]",
        badge:
          "bg-red-600 text-white shadow-[0_16px_30px_-22px_rgba(220,38,38,0.34)]",
        ring: "border-red-100/90 text-red-800 bg-red-50/70",
        accent: "from-red-600 via-red-500 to-blue-500",
        icon: <TriangleAlert className="h-4 w-4" />,
        headline: "Open incident requiring attention",
        summary:
          "This report remains active. Review the clinical narrative, supporting evidence, and linked announcement for operational follow-through.",
      };

  const metaCards = [
    {
      label: "Department",
      value: incident.departments?.name ?? "Unknown Department",
      icon: <Stethoscope className="h-4 w-4" />,
    },
    {
      label: "Reported By",
      value: incident.profiles?.full_name ?? "Staff member",
      icon: <UserRound className="h-4 w-4" />,
    },
    {
      label: "Clinical Role",
      value: formatRoleLabel(incident.profiles?.role),
      icon: <ShieldPlus className="h-4 w-4" />,
    },
    {
      label: "Recorded",
      value: formatDate(incident.date_of_reporting),
      icon: <CalendarDays className="h-4 w-4" />,
    },
  ];

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-5 -z-10 h-[28rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(245,249,255,0.74),rgba(255,255,255,0))]" />

      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.55)] backdrop-blur-sm transition-all hover:cursor-pointer hover:border-slate-200 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to incidents
      </button>

      <article className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
        <div
          className={`relative overflow-hidden border-b px-6 py-7 md:px-8 md:py-8 ${statusClasses.banner}`}
        >
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${statusClasses.accent}`}
          />
          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${statusClasses.badge}`}
                >
                  {statusClasses.icon}
                  {incident.is_resolved ? "Resolved" : "Unresolved"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                  Clinical Incident Review
                </span>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  {incident.departments?.code ?? "Department"} report
                </p>
                <h1 className="mt-3 max-w-full overflow-x-auto whitespace-nowrap text-[clamp(1.9rem,4.2vw,3.1rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                  {statusClasses.headline}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  {statusClasses.summary}
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Incident occurred
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatDateTime(
                      incident.date_of_incident,
                      incident.time_of_incident,
                    )}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Report filed
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatDate(incident.date_of_reporting)}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:col-span-2 xl:col-span-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Operational posture
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {incident.is_resolved
                      ? "Closed with documentation"
                      : "Pending department action"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
              {!incident.is_resolved ? (
                <button
                  type="button"
                  onClick={() => onResolve(incident.id)}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-800 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_24px_40px_-28px_rgba(30,64,175,0.42)] transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle className="h-4 w-4" />
                  {busy ? "Updating..." : "Mark as resolved"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onDelete(incident.id)}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-white/85 px-5 py-3.5 text-sm font-semibold text-blue-800 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete report
              </button>
              <div
                className={`rounded-[1.5rem] border p-4 ${statusClasses.ring}`}
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em]">
                  Care note
                </p>
                <p className="mt-2 text-sm leading-7">
                  {incident.is_resolved
                    ? "Maintain the attachment and linked announcement as the source of truth for any future audit or retrospective review."
                    : "Coordinate closure updates promptly to keep the incident timeline accurate for leadership review and service recovery."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 md:px-8 xl:grid-cols-[minmax(0,1.5fr)_21rem] xl:items-start">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
              <div className="border-b border-slate-100 px-6 py-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Executive summary
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                  Incident narrative and clinical handoff
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  Review the structured SBAR documentation below to understand
                  the event context, assessment, and recommended next steps.
                </p>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <SbarSection
                  label="Situation"
                  text={incident.sbar_situation}
                  color="primary"
                />
                <SbarSection
                  label="Background"
                  text={incident.sbar_background}
                  color="secondary"
                />
                <SbarSection
                  label="Assessment"
                  text={incident.sbar_assessment}
                  color="neutral"
                />
                <SbarSection
                  label="Recommendation"
                  text={incident.sbar_recommendation}
                  color="highlight"
                />
              </div>
            </section>

            {incident.file_name ? (
              <section className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-6 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Attached evidence
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                      Supporting incident record
                    </h2>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <FileText className="h-5 w-5" />
                  </span>
                </div>
                <AttachmentPreview
                  incidentId={incident.id}
                  fileName={incident.file_name}
                  mimeType={incident.file_mime_type}
                  fileSize={incident.file_size_bytes}
                />
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Case profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                Reporting context
              </h2>
              <div className="mt-5 grid gap-3">
                {metaCards.map((card) => (
                  <DetailRailItem
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Timeline
              </p>
              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Clock className="h-4 w-4" />
                    </span>
                    <span className="mt-2 h-full w-px bg-slate-200" />
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Incident event
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDateTime(
                        incident.date_of_incident,
                        incident.time_of_incident,
                      )}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Initial occurrence recorded by the reporting unit.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Formal submission
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(incident.date_of_reporting)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Incident report entered into the platform for review and
                      follow-up.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {incident.announcement_id ? (
              <section className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-blue-700">
                  Linked communication
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                  Announcement issued
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Leadership-facing communication has been created from this
                  incident and can be reviewed alongside the case record.
                </p>
                <Link
                  href={`/announcements/${incident.announcement_id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900"
                >
                  Open linked announcement
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </section>
            ) : null}
          </aside>
        </div>
      </article>
    </div>
  );
}
