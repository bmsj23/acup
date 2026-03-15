import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
};

export default function FormField({
  label,
  children,
  className = "",
  labelClassName = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <p
        className={`text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500 ${
          labelClassName || ""
        }`.trim()}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
