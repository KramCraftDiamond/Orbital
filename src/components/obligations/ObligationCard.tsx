import { BrainCircuit, ClipboardCheck, FileSearch } from "lucide-react";
import type { Obligation } from "../../types/orbital";
import { DepartmentChip, RiskBadge, StatusPill } from "../ui/badges";

export function ObligationCard({ obligation }: { obligation: Obligation }) {
  return (
    <article className="rounded-lg border border-border-default bg-surface-strong p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border-default bg-bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase text-text-secondary">
              {obligation.id}
            </span>
            <RiskBadge severity={obligation.severity} />
            <StatusPill status={obligation.validationStatus} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">{obligation.actionRequired}</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{obligation.sourceText}</p>
        </div>
        <div className="rounded-md bg-accent-cyan/10 p-2 text-accent-cyan">
          <BrainCircuit className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Detail icon={FileSearch} label="Source clause" value={obligation.sourceClause} />
        <Detail icon={ClipboardCheck} label="Deadline" value={obligation.deadline} />
        <Detail icon={BrainCircuit} label="Confidence" value={`${Math.round(obligation.confidence * 100)}%`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Assigned departments</p>
          <div className="flex flex-wrap gap-2">
            {obligation.departments.map((department) => (
              <DepartmentChip key={department} department={department} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Evidence required</p>
          <ul className="space-y-1 text-sm text-text-secondary">
            {obligation.evidenceRequired.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent-cyan" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-border-default bg-bg-secondary p-4">
        <p className="text-xs font-semibold uppercase text-text-muted">Policy impact</p>
        <p className="mt-2 text-sm text-text-secondary">{obligation.policyImpact}</p>
      </div>
    </article>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BrainCircuit;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border-default bg-bg-secondary p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
