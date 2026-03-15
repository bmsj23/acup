import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import WorkspacePanel from "./workspace-panel";

type WorkspaceEmptyStateProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function WorkspaceEmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
}: WorkspaceEmptyStateProps) {
  return (
    <WorkspacePanel className="px-6 py-20 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Icon className="h-6 w-6" />
        </span>
        <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </WorkspacePanel>
  );
}
