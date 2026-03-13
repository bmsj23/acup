const COLOR_MAP: Record<
  string,
  {
    border: string;
    panel: string;
    chip: string;
    label: string;
    accent: string;
  }
> = {
  primary: {
    border: "border-blue-100/90",
    panel: "bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))]",
    chip: "bg-blue-50",
    label: "text-blue-700",
    accent: "from-blue-700 to-blue-400",
  },
  secondary: {
    border: "border-blue-100/90",
    panel: "bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))]",
    chip: "bg-blue-50",
    label: "text-blue-700",
    accent: "from-blue-600 to-blue-300",
  },
  neutral: {
    border: "border-blue-100/90",
    panel: "bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))]",
    chip: "bg-blue-50",
    label: "text-blue-700",
    accent: "from-blue-800 to-slate-400",
  },
  highlight: {
    border: "border-blue-100/90",
    panel: "bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))]",
    chip: "bg-blue-50",
    label: "text-blue-700",
    accent: "from-blue-700 to-slate-500",
  },
  technical: {
    border: "border-blue-100/90",
    panel: "bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))]",
    chip: "bg-blue-50",
    label: "text-blue-700",
    accent: "from-blue-900 to-blue-400",
  },
};

export default function SbarSection({
  label,
  text,
  color = "primary",
}: {
  label: string;
  text: string;
  color?: string;
}) {
  // eslint-disable-next-line security/detect-object-injection
  const c = COLOR_MAP[color] ?? COLOR_MAP.primary;

  return (
    <section
      className={`group relative overflow-hidden rounded-[1.6rem] border ${c.border} ${c.panel} p-6 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.3)] transition-transform duration-300 hover:-translate-y-0.5`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${c.accent}`}
      />
      <div className="relative">
        <div className="min-w-0">
          <p
            className={`inline-flex rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.28em] ${c.chip} ${c.label}`}
          >
            {label}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Structured narrative
          </p>
          <p
            className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700"
          >
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}
