"use client";

import { AlertTriangle, X } from "lucide-react";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import type { DashboardOverviewResponse } from "@/types/monitoring";

type DashboardIncidentBannerProps = {
  overview: DashboardOverviewResponse | null;
  dismissed: boolean;
  onDismiss: () => void;
};

export default function DashboardIncidentBanner({
  overview,
  dismissed,
  onDismiss,
}: DashboardIncidentBannerProps) {
  const previewItems = overview?.unresolved_preview ?? [];

  if (dismissed || previewItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-red-100 p-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-red-800">
            {overview?.totals.open_incidents_count ?? previewItems.length} Open Incident
            {(overview?.totals.open_incidents_count ?? previewItems.length) === 1
              ? ""
              : "s"}
          </h2>
          <ul className="mt-2 space-y-1">
            {previewItems.slice(0, 3).map((incident) => (
              <li key={incident.id} className="text-xs text-red-700">
                <span className="font-medium">
                  {incident.departments?.name ?? "Unknown Department"}
                </span>
                {" - "}
                <span className="line-clamp-1 inline">{incident.sbar_situation}</span>
                <span className="ml-1 text-red-700">({incident.date_of_incident})</span>
              </li>
            ))}
          </ul>
          <OptimisticRouteLink
            href="/incidents"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 underline decoration-red-300 transition-colors hover:cursor-pointer hover:text-red-900"
          >
            View all incidents
          </OptimisticRouteLink>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-red-400 transition-colors hover:cursor-pointer hover:bg-red-100 hover:text-red-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
