import { CalendarDays, FileText, ShieldCheck } from "lucide-react";
import type { Circular } from "../../types/orbital";
import { StatusPill, RegulatorBadge } from "../ui/badges";

export function CircularMetadataCard({ circular }: { circular: Circular }) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-strong p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <RegulatorBadge regulator={circular.regulator} />
            <StatusPill status={circular.validationStatus} />
          </div>
          <h3 className="text-xl font-semibold text-text-primary">{circular.title}</h3>
          <p className="mt-2 font-mono text-xs text-text-muted">{circular.circularNumber}</p>
        </div>
        <div className="rounded-md bg-accent-success/10 p-2 text-accent-success">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaItem icon={CalendarDays} label="Issue date" value={circular.issueDate} />
        <MetaItem icon={CalendarDays} label="Effective date" value={circular.effectiveDate} />
        <MetaItem icon={FileText} label="Clauses parsed" value={String(circular.totalClauses)} />
        <MetaItem icon={ShieldCheck} label="Obligations found" value={String(circular.totalObligations)} />
      </div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border-default bg-bg-secondary p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="font-semibold text-text-primary">{value}</p>
    </div>
  );
}
