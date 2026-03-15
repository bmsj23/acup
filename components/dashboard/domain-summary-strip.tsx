"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, AlertTriangle, ArrowRight, BookOpen, Wrench } from "lucide-react";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import WorkspacePanel from "@/components/workspace/workspace-panel";

type ModuleAction = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
};

const moduleActions: ModuleAction[] = [
  {
    href: "/equipment",
    title: "Equipment",
    description: "Assets, utilization, and machine activity.",
    icon: Wrench,
    accentClassName: "text-blue-800 bg-blue-50",
  },
  {
    href: "/productivity",
    title: "Productivity",
    description: "Procedures, staffing, and monthly ratios.",
    icon: Activity,
    accentClassName: "text-emerald-700 bg-emerald-50",
  },
  {
    href: "/incidents",
    title: "Incidents",
    description: "Open cases, follow-up, and reporting.",
    icon: AlertTriangle,
    accentClassName: "text-red-700 bg-red-50",
  },
  {
    href: "/training",
    title: "Training",
    description: "Modules, compliance, and completion tracking.",
    icon: BookOpen,
    accentClassName: "text-violet-700 bg-violet-50",
  },
];

export default function DomainSummaryStrip() {
  return (
    <section className="space-y-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
        Operational modules
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {moduleActions.map((action) => {
          const Icon = action.icon;

          return (
            <OptimisticRouteLink key={action.href} href={action.href} className="block">
              <WorkspacePanel className="group h-full p-5 transition-transform duration-300 hover:-translate-y-0.5 hover:border-blue-200/80">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{action.title}</p>
                      <p className="mt-2 max-w-52 text-sm leading-6 text-slate-600">
                        {action.description}
                      </p>
                    </div>
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.accentClassName}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>

                  <div className="mt-auto pt-6">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors group-hover:text-blue-900">
                      Open module
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </WorkspacePanel>
            </OptimisticRouteLink>
          );
        })}
      </div>
    </section>
  );
}
