import type { MAPCard as MAPCardType } from "../../types/orbital";
import { DepartmentChip, RegulatorBadge, RiskBadge, StatusPill } from "../ui/badges";

export function MAPCard({ card }: { card: MAPCardType }) {
  return (
    <article className="rounded-lg border border-border-default bg-surface-base p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border-default bg-bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase text-text-secondary">
              {card.id}
            </span>
            <RegulatorBadge regulator={card.sourceRegulator} />
            <RiskBadge severity={card.severity} />
            <StatusPill status={card.status} />
          </div>
          <h3 className="text-xl font-semibold text-text-primary">{card.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{card.summary}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-md border border-border-default bg-surface-strong p-4">
          <p className="text-xs font-semibold uppercase text-text-muted">Source Clause</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{card.sourceClause}</p>
          <p className="mt-2 text-sm text-text-secondary">{card.circularTitle}</p>
        </div>
        <div className="rounded-md border border-border-default bg-surface-strong p-4">
          <p className="text-xs font-semibold uppercase text-text-muted">Ownership</p>
          <p className="mt-3 text-sm font-semibold text-text-primary">{card.owner}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {card.assignedDepartments.map((department) => (
              <DepartmentChip key={department} department={department} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Evidence Required</p>
          <ul className="space-y-2 text-sm text-text-secondary">
            {card.evidenceRequired.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent-cyan" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Validation Checklist</p>
          <ul className="space-y-2 text-sm text-text-secondary">
            {card.validationChecklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded border border-border-active bg-accent-cyan/10" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-border-default bg-bg-secondary p-4">
        <p className="text-xs font-semibold uppercase text-text-muted">AI reasoning summary</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{card.aiReasoning}</p>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button className="inline-flex min-w-36 items-center justify-center rounded-md bg-accent-cyan px-4 py-2 text-center text-sm font-semibold text-background">
          Acknowledge task
        </button>
        <button className="inline-flex min-w-36 items-center justify-center rounded-md border border-border-default bg-surface-elevated px-4 py-2 text-center text-sm font-semibold text-text-primary">
          Request evidence
        </button>
        <button className="inline-flex min-w-36 items-center justify-center rounded-md border border-border-default bg-surface-elevated px-4 py-2 text-center text-sm font-semibold text-text-primary">
          Audit chain
        </button>
      </div>
    </article>
  );
}
