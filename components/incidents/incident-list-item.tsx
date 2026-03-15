"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle,
  Paperclip,
  Stethoscope,
  XCircle,
} from "lucide-react";
import type { IncidentItem } from "./types";
import { DEPT_CODE_LABELS, INCIDENT_TYPE_LABELS } from "./utils";

type IncidentListItemProps = {
  incident: IncidentItem;
  onOpen: (id: string) => void;
};

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

export default function IncidentListItem({
  incident,
  onOpen,
}: IncidentListItemProps) {
  const statusClasses = incident.is_resolved
    ? {
        badge: "bg-emerald-50 text-emerald-700",
        border: "border-blue-100/75",
        accent: "bg-blue-400/85",
        icon: <CheckCircle className="h-3.5 w-3.5" />,
      }
    : {
        badge: "bg-red-50 text-red-700",
        border: "border-red-100/80",
        accent: "bg-red-500/85",
        icon: <XCircle className="h-3.5 w-3.5" />,
      };

  return (
    <button
      type="button"
      onClick={() => onOpen(incident.id)}
      className={`group relative w-full overflow-hidden rounded-[1.8rem] border bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-5 text-left shadow-[0_24px_60px_-42px_rgba(30,64,175,0.16)] transition-all duration-300 hover:cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-44px_rgba(30,64,175,0.22)] ${statusClasses.border}`}
    >
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${statusClasses.accent}`} />

      <div className="flex flex-col gap-5 pl-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${statusClasses.badge}`}
            >
              {statusClasses.icon}
              {incident.is_resolved ? "Resolved" : "Unresolved"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/75 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blue-700">
              <Stethoscope className="h-3.5 w-3.5" />
              {incident.departments?.name
                ?? DEPT_CODE_LABELS[incident.departments?.code ?? ""]
                ?? "Unknown Department"}
            </span>
            <span className="rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {INCIDENT_TYPE_LABELS[incident.incident_type] ?? incident.incident_type}
            </span>
            {incident.file_name ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
                <Paperclip className="h-3.5 w-3.5" />
                Attachment
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Incident situation
            </p>
            <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-slate-950 transition-colors group-hover:text-blue-800 [font-family:var(--font-playfair)]">
              {incident.sbar_situation}
            </h2>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-blue-100/80 bg-blue-50/45 p-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Occurred
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatDateTime(incident.date_of_incident, incident.time_of_incident)}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-blue-100/80 bg-blue-50/45 p-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Reported by
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {incident.profiles?.full_name ?? "Staff member"}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-blue-100/80 bg-white/95 p-3.5 text-slate-700">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Resolution state
              </p>
              <p className="mt-2 text-sm font-semibold text-current">
                {incident.is_resolved
                  ? "Closed with documentation"
                  : "Open and awaiting follow-up"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-end justify-between gap-4 lg:w-56 lg:flex-col lg:items-end">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{incident.date_of_reporting}</span>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
            Open incident
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
}
