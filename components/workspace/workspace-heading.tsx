type WorkspaceHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export default function WorkspaceHeading({
  eyebrow,
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
}: WorkspaceHeadingProps) {
  return (
    <div className={className}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
        {eyebrow}
      </p>
      <h1
        className={`mt-3 text-4xl font-semibold leading-tight text-slate-950 [font-family:var(--font-playfair)] md:text-[3.2rem] ${
          titleClassName ?? ""
        }`.trim()}
      >
        {title}
      </h1>
      {description ? (
        <p className={`mt-4 max-w-3xl text-sm leading-8 text-slate-600 ${descriptionClassName ?? ""}`.trim()}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
