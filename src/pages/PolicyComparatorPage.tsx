import { AlertTriangle, CheckCircle2, GitCompareArrows } from "lucide-react";
import { Panel, PanelHeader } from "../components/ui/panel";
import { StatusPill } from "../components/ui/badges";
import { obligations } from "../data/mockData";

export function PolicyComparatorPage() {
  return (
    <div className="space-y-6 p-5 xl:p-8">
      <div>
        <p className="text-xs font-semibold uppercase text-accent-cyan">Policy Comparator</p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">RAG-backed gap and conflict analysis</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          Compare extracted obligations against internal policies, SOPs, and prior circulars to detect coverage gaps,
          outdated policy sections, and implementation conflicts.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel>
          <PanelHeader title="Comparison Matrix" eyebrow="New circular vs internal policy" />
          <div className="space-y-3">
            {obligations.map((obligation, index) => (
              <div key={obligation.id} className="rounded-md border border-border-default bg-surface-strong p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{obligation.domain}</p>
                    <p className="mt-1 text-sm text-text-secondary">{obligation.actionRequired}</p>
                  </div>
                  <StatusPill status={index === 0 ? "policy update required" : index === 1 ? "partial coverage" : "review"} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Impact Chain" eyebrow="Regulation to process change" />
          <div className="space-y-4">
            {[
              ["Circular", "RBI cyber resilience controls"],
              ["Obligation", "Enhanced authentication for high-risk transactions"],
              ["Affected policy", "Digital Banking Authentication SOP"],
              ["Department", "IT, Cybersecurity, Digital Banking"],
              ["Evidence", "Policy update, configuration screenshots, test report"],
              ["Decision", "Human sign-off required before closure"],
            ].map(([label, copy], index) => (
              <div key={label} className="relative rounded-md border border-border-default bg-surface-strong p-4">
                <div className="mb-2 flex items-center gap-2">
                  {index < 2 ? <GitCompareArrows className="h-4 w-4 text-accent-cyan" /> : index < 5 ? <AlertTriangle className="h-4 w-4 text-accent-warning" /> : <CheckCircle2 className="h-4 w-4 text-accent-success" />}
                  <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
                </div>
                <p className="text-sm font-semibold text-text-primary">{copy}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
