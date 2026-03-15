import type { ReactNode } from "react";
import WorkspacePanel from "./workspace-panel";

type WorkspaceFilterBarProps = {
  children: ReactNode;
  className?: string;
};

export default function WorkspaceFilterBar({
  children,
  className,
}: WorkspaceFilterBarProps) {
  return (
    <WorkspacePanel className={`p-5 ${className ?? ""}`.trim()}>
      {children}
    </WorkspacePanel>
  );
}
