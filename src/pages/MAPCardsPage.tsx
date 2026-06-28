import { useState } from "react";
import { useNavigate } from "react-router";
import { MAPCard } from "../components/map-cards/MAPCard";
import { Button, PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function MAPCardsPage() {
  const navigate = useNavigate();
  const workflow = usePipelineWorkflow();
  const [severityFilter, setSeverityFilter] = useState<"all" | "high">("all");
  const [acknowledgedCards, setAcknowledgedCards] = useState<string[]>([]);
  const activeCards = workflow.mapCards;
  const visibleCards =
    severityFilter === "high"
      ? activeCards.filter((card) => card.severity === "high" || card.severity === "critical")
      : activeCards;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="MAP Card Task Feed"
        title="Generated compliance execution cards"
        action={
          <Button
            variant="secondary"
            onClick={() => setSeverityFilter((current) => (current === "all" ? "high" : "all"))}
            type="button"
          >
            {severityFilter === "all" ? "Filter high severity" : "Show all cards"}
          </Button>
        }
      >
        MAP Cards convert extracted obligations into accountable department tasks with owners,
        deadlines, evidence requirements, AI reasoning, validation checklists, and audit links.
      </PageHeader>

      {workflow.mapCardsReady && (
        <Panel>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-accent-cyan">MAP generation complete</p>
              <h3 className="mt-2 text-xl font-semibold text-text-primary">
                Cards generated from validated obligation JSON
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                The next workflow step is task acknowledgement, evidence collection, and audit tracking.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate("/app/evidence")}
              type="button"
            >
              Continue to evidence
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {visibleCards.map((card) => (
            <MAPCard
              key={card.id}
              card={card}
              acknowledged={acknowledgedCards.includes(card.id)}
              onAcknowledge={(cardId) =>
                setAcknowledgedCards((current) =>
                  current.includes(cardId) ? current : [...current, cardId],
                )
              }
              onRequestEvidence={() => navigate("/app/evidence")}
              onAuditChain={() => navigate("/app/audit")}
            />
          ))}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel>
            <PanelHeader title="Deadline Risk" eyebrow="Operational exposure" />
            <div className="space-y-3">
              {[
                ["Overdue", "1", "CERT-In incident reporting playbook"],
                ["Due in 7 days", "4", "Evidence pending or partial"],
                ["Human review", "9", "Closure blocked by approval"],
              ].map(([label, count, copy]) => (
                <div key={label} className="rounded-md border border-border-default bg-surface-strong p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">{label}</p>
                    <span className="text-2xl font-semibold text-accent-warning">{count}</span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Human Sign-off" eyebrow="Closure policy" />
            <div className="rounded-md border border-accent-cyan/25 bg-accent-cyan/10 p-4">
              <div className="mb-2 text-sm font-semibold text-accent-cyan">
                AI cannot close tasks alone
              </div>
              <p className="text-sm leading-6 text-text-secondary">
                ORBITAL can validate evidence and recommend closure, but final compliance closure must be approved by an authorized human reviewer.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </PageContainer>
  );
}
