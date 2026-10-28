import type { ReactNode } from "react";

export function FormField({
  id,
  label,
  optional,
  error,
  hint,
  children,
  className = "",
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
        <span className="text-sm text-muted-foreground">{optional ? "İsteğe bağlı" : "Zorunlu"}</span>
      </div>
      {children}
      {hint && (
        <p
          id={`${id}-hint`}
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
