import type { MAPCard as MAPCardType } from "../../types/orbital";
import { DepartmentChip, RegulatorBadge, RiskBadge, StatusPill } from "../ui/badges";
import { Button } from "../ui/layout";

type MAPCardProps = {
  card: MAPCardType;
  acknowledged?: boolean;
  onAcknowledge?: (cardId: string) => void;
  onRequestEvidence?: (cardId: string) => void;
  onAuditChain?: (cardId: string) => void;
};

export function MAPCard({
  card,
  acknowledged,
  onAcknowledge,
  onRequestEvidence,
  onAuditChain,
}: MAPCardProps) {
  const hasMeasurability =
    card.measurableOutcome ||
    card.acceptanceCriteria?.length ||
    card.evidenceValidationRules?.length ||
    card.reviewerDepartment ||
    card.escalationLevel ||
    card.closurePolicy;

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

      {hasMeasurability && (
        <div className="mt-5 rounded-md border border-border-default bg-surface-strong p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
            <div>
              <p className="text-xs font-semibold uppercase text-text-muted">Measurable Outcome</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {card.measurableOutcome || "Assigned department completes the action and supplies reviewer-ready evidence."}
              </p>
              {card.acceptanceCriteria?.length ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Acceptance Criteria</p>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    {card.acceptanceCriteria.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent-success" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Meta label="Reviewer" value={card.reviewerDepartment || "Compliance"} />
              <Meta label="Escalation" value={card.escalationLevel || "L1"} />
              <Meta label="Deadline type" value={card.deadlineType || "derived"} />
            </div>
          </div>

          {card.evidenceValidationRules?.length ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Evidence Validation Rules</p>
              <ul className="space-y-2 text-sm text-text-secondary">
                {card.evidenceValidationRules.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-4 w-4 rounded border border-border-active bg-accent-cyan/10" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {card.closurePolicy && (
            <div className="mt-4 rounded-md border border-accent-cyan/25 bg-accent-cyan/10 p-3 text-sm leading-6 text-text-secondary">
              {card.closurePolicy}
            </div>
          )}
        </div>
      )}

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

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          variant="primary"
          className="min-w-32"
          onClick={() => onAcknowledge?.(card.id)}
          type="button"
        >
          {acknowledged ? "Acknowledged" : "Acknowledge task"}
        </Button>
        <Button
          variant="secondary"
          className="min-w-32"
          onClick={() => onRequestEvidence?.(card.id)}
          type="button"
        >
          Request evidence
        </Button>
        <Button
          variant="secondary"
          className="min-w-32"
          onClick={() => onAuditChain?.(card.id)}
          type="button"
        >
          Audit chain
        </Button>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-secondary p-3">
      <p className="text-[10px] font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
