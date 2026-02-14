type BreadcrumbItem = {
  label: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
      <ol className="flex items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span className="text-zinc-400">/</span> : null}
            <span
              className={
                index === items.length - 1
                  ? "font-medium text-zinc-900"
                  : "text-zinc-500"
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}