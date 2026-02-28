const COLOR_MAP: Record<string, { border: string; bg: string; label: string; accent: string }> = {
primary: {
    border: "border-blue-200",
    bg: "bg-blue-50/60",
    label: "text-blue-700",
    accent: "border-l-blue-500",
  },
  secondary: {
    border: "border-sky-200",
    bg: "bg-sky-50/60",
    label: "text-sky-700",
    accent: "border-l-sky-500",
  },
  neutral: {
    border: "border-slate-200",
    bg: "bg-slate-50/60",
    label: "text-slate-700",
    accent: "border-l-slate-500",
  },
  highlight: {
    border: "border-indigo-200",
    bg: "bg-indigo-50/60",
    label: "text-indigo-700",
    accent: "border-l-indigo-500",
  },
  technical: {
    border: "border-cyan-200",
    bg: "bg-cyan-50/60",
    label: "text-cyan-700",
    accent: "border-l-cyan-500",
  },
};

export default function SbarSection({
  label,
  text,
  color = "blue",
}: {
  label: string;
  text: string;
  color?: string;
}) {
  // eslint-disable-next-line security/detect-object-injection
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <div
      className={`rounded-lg border ${c.border} ${c.bg} border-l-4 ${c.accent} p-5 transition-shadow hover:shadow-md`}
    >
      <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${c.label}`}>
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{text}</p>
    </div>
  );
}