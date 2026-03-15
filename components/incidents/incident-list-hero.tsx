"use client";

import { Plus } from "lucide-react";
import WorkspaceHeading from "@/components/workspace/workspace-heading";
import WorkspacePanel from "@/components/workspace/workspace-panel";
import WorkspaceStatStrip from "@/components/workspace/workspace-stat-strip";

type IncidentListHeroProps = {
  paginationTotal: number;
  scopeLabel: string;
  monthFilterActive: boolean;
  selectedMonthLabel: string;
  departmentLabel: string;
  onCreateNew: () => void;
};

export default function IncidentListHero({
  paginationTotal,
  scopeLabel,
  monthFilterActive,
  selectedMonthLabel,
  departmentLabel,
  onCreateNew,
}: IncidentListHeroProps) {
  return (
    <WorkspacePanel className="overflow-hidden">
      <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.28fr)_21rem] xl:items-end">
        <div className="flex h-full flex-col">
          <WorkspaceHeading
            eyebrow="Clinical safety workspace"
            title="Incident command feed"
            description="Review unresolved cases first, refine the feed with focused filters, and open each SBAR record in place."
            descriptionClassName="max-w-[50rem]"
          />

          <div className="mt-6 xl:mt-auto">
            <WorkspaceStatStrip
              columnsClassName="sm:grid-cols-2 xl:grid-cols-3"
              items={[
                {
                  label: "Matching incidents",
                  value: paginationTotal,
                  description: "Records matching the current feed scope.",
                },
                {
                  label: "Feed mode",
                  value: scopeLabel,
                  description: monthFilterActive
                    ? `Scoped to ${selectedMonthLabel}.`
                    : "Showing all dates unless you apply a month filter.",
                  tone: "highlight",
                },
                {
                  label: "Department scope",
                  value: departmentLabel,
                  description: "Department filter applied to the incident feed.",
                },
              ]}
            />
          </div>
        </div>

        <WorkspacePanel className="flex h-full flex-col justify-between p-5">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
              Workspace action
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
              File a new incident
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Capture the situation, background, assessment, recommendation, and supporting evidence in one structured report.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-800 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_22px_40px_-28px_rgba(30,64,175,0.45)] transition-colors hover:cursor-pointer hover:bg-blue-900 xl:mt-8"
          >
            <Plus className="h-4 w-4" />
            New incident report
          </button>
        </WorkspacePanel>
      </div>
    </WorkspacePanel>
  );
}
