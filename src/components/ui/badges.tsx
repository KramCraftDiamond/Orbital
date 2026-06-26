import type { MAPStatus, Regulator, Severity, ValidationStatus } from "../../types/orbital";
import { cn, regulatorStyle, severityClasses, statusClasses } from "../../lib/ui";

export function RiskBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase",
        severityClasses(severity),
      )}
    >
      {severity}
    </span>
  );
}

export function StatusPill({ status }: { status: MAPStatus | ValidationStatus | string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase",
        statusClasses(status),
      )}
    >
      {status}
    </span>
  );
}

export function RegulatorBadge({ regulator }: { regulator: Regulator }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase"
      style={regulatorStyle(regulator)}
    >
      {regulator}
    </span>
  );
}

export function DepartmentChip({ department }: { department: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border-default bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary">
      {department}
    </span>
  );
}
