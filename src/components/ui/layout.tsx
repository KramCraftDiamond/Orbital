import type { ReactNode } from "react";
import { cn } from "../../lib/ui";

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] space-y-6 px-5 py-6 lg:px-8 xl:py-8", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-accent-cyan">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary">{title}</h2>
        {children && <div className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-3">{action}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-md px-4 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" && "bg-accent-cyan text-background hover:bg-accent-cyan/85",
        variant === "secondary" && "border border-border-default bg-surface-elevated text-text-primary hover:bg-surface-strong",
        variant === "success" && "bg-accent-success text-background hover:bg-accent-success/85",
        variant === "warning" && "bg-accent-warning text-background hover:bg-accent-warning/85",
        variant === "danger" &&
          "border border-accent-critical/35 bg-accent-critical/10 text-accent-critical hover:bg-accent-critical/15",
        variant === "ghost" && "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border-default bg-bg-secondary p-3">
      <p className="text-[10px] font-semibold uppercase text-text-muted">{label}</p>
      <div className="mt-2 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}
