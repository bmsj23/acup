"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ClipboardList,
  Clock3,
  Cpu,
  ArrowRight,
} from "lucide-react";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import WorkspacePanel from "@/components/workspace/workspace-panel";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import type { MonitoringDepartment } from "@/types/monitoring";

type DomainSummaryStripProps = {
  role: "avp" | "division_head" | "department_head";
  selectedDepartment: MonitoringDepartment | null;
};

type QuickAction = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
};

export default function DomainSummaryStrip({
  role,
  selectedDepartment,
}: DomainSummaryStripProps) {
  const isLeadership = role === "avp" || role === "division_head";
  const departmentCapabilities = getDepartmentCapabilities(selectedDepartment);
  const quickActions: QuickAction[] = [
    {
      href: "/announcements",
      title: "Announcements",
      description: "System memos and urgent updates.",
      icon: Bell,
      accentClassName: "bg-amber-50 text-amber-700",
    },
    {
      href: "/productivity",
      title: "Productivity",
      description: "Procedures, tests, and staffing ratios.",
      icon: Cpu,
      accentClassName: "bg-emerald-50 text-emerald-700",
    },
    {
      href: "/training",
      title: "Training",
      description: "Modules, links, and compliance encoding.",
      icon: BookOpen,
      accentClassName: "bg-blue-50 text-blue-700",
    },
    ...(isLeadership || departmentCapabilities.supportsTurnaroundTime
      ? [
          {
            href: "/turnaround-time",
            title: "Turnaround Time",
            description: "Service-level timing entries and review.",
            icon: Clock3,
            accentClassName: "bg-orange-50 text-orange-700",
          },
        ]
      : []),
    ...(isLeadership
      ? [
          {
            href: "/audit",
            title: "Audit Logs",
            description: "Activity review and access traces.",
            icon: ClipboardList,
            accentClassName: "bg-slate-100 text-slate-700",
          },
        ]
      : []),
  ];

  return (
    <WorkspacePanel className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Quick access
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            Open the next workspace fast
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Keep the dashboard focused on KPIs here, then jump straight into the module that needs action.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <OptimisticRouteLink
              key={action.href}
              href={action.href}
              className="group rounded-[1.45rem] border border-blue-100/80 bg-white/90 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/55"
            >
              <div className="flex h-full items-start gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${action.accentClassName}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{action.description}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors group-hover:text-blue-900">
                    Open
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </OptimisticRouteLink>
          );
        })}
      </div>
    </WorkspacePanel>
  );
}
