import type { ReactNode } from "react";
import { cn } from "../../lib/ui";

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border-default bg-surface-base p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10px] font-semibold uppercase text-text-muted">{eyebrow}</p>
        )}
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      </div>
      {action}
    </div>
  );
}
