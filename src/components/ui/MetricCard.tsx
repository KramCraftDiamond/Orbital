import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/ui";
import { Panel } from "./panel";

export function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone?: "cyan" | "violet" | "success" | "warning" | "critical";
}) {
  const toneClasses = {
    cyan: "bg-accent-cyan/10 text-accent-cyan",
    violet: "bg-accent-violet/10 text-accent-violet",
    success: "bg-accent-success/10 text-accent-success",
    warning: "bg-accent-warning/10 text-accent-warning",
    critical: "bg-accent-critical/10 text-accent-critical",
  }[tone];

  return (
    <Panel className="min-h-36">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="mt-3 text-4xl font-semibold text-text-primary">{value}</p>
          <p className="mt-3 flex items-center gap-1 text-xs text-text-muted">
            <ArrowUpRight className="h-3.5 w-3.5 text-accent-success" />
            {change}
          </p>
        </div>
        <span className={cn("rounded-md p-2", toneClasses)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Panel>
  );
}
