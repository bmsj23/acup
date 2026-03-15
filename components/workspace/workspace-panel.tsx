import type { ReactNode } from "react";

type WorkspacePanelProps = {
  children: ReactNode;
  className?: string;
  tone?: "blue" | "red" | "white";
};

function getToneClassName(tone: WorkspacePanelProps["tone"]) {
  switch (tone) {
    case "red":
      return "border-red-100/80 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-46px_rgba(220,38,38,0.12)]";
    case "white":
      return "border-zinc-200 bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.12)]";
    case "blue":
    default:
      return "border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]";
  }
}

export default function WorkspacePanel({
  children,
  className,
  tone = "blue",
}: WorkspacePanelProps) {
  return (
    <section
      className={`rounded-[1.9rem] border ${getToneClassName(tone)} ${
        className ?? ""
      }`.trim()}
    >
      {children}
    </section>
  );
}
