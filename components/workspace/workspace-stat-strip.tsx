type WorkspaceStatStripItem = {
  label: string;
  value: string | number;
  description: string;
  tone?: "default" | "highlight";
};

type WorkspaceStatStripProps = {
  items: WorkspaceStatStripItem[];
  columnsClassName?: string;
};

export default function WorkspaceStatStrip({
  items,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-4",
}: WorkspaceStatStripProps) {
  return (
    <div className={`grid items-stretch gap-4 ${columnsClassName}`.trim()}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`h-full rounded-[1.3rem] border px-4 py-3.5 ${
            item.tone === "highlight"
              ? "border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))]"
              : "border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))]"
          } shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]`}
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {item.label}
          </p>
          <p className="mt-2 text-[1.85rem] font-semibold leading-none text-slate-950">{item.value}</p>
          <p className="mt-1 text-sm text-slate-600">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
