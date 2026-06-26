import { EvidenceChecklist } from "../components/evidence/EvidenceChecklist";
import { EvidenceValidationPanel } from "../components/evidence/EvidenceValidationPanel";
import { DepartmentChip, RiskBadge, StatusPill } from "../components/ui/badges";
import { Panel, PanelHeader } from "../components/ui/panel";
import { evidence, mapCards } from "../data/mockData";

export function EvidencePortalPage() {
  const selectedMap = mapCards[0];
  const selectedEvidence = evidence[0];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-5 xl:p-8">
      <div>
        <p className="text-xs font-semibold uppercase text-accent-cyan">Evidence Portal</p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">Validate proof against regulatory obligations</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          Departments upload evidence against MAP Cards. ORBITAL compares the proof against the original obligation,
          identifies matched and missing requirements, then routes the result for human approval.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <PanelHeader title="Selected MAP Card" eyebrow={selectedMap.id} />
          <div className="mb-4 flex flex-wrap gap-2">
            <RiskBadge severity={selectedMap.severity} />
            <StatusPill status={selectedMap.status} />
          </div>
          <h3 className="text-xl font-semibold text-text-primary">{selectedMap.title}</h3>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{selectedMap.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedMap.assignedDepartments.map((department) => (
              <DepartmentChip key={department} department={department} />
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-border-active bg-surface-strong p-6 text-center">
            <h3 className="text-lg font-semibold text-text-primary">Upload supplementary evidence</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Add reports, policy updates, screenshots, logs, or sign-off records for this MAP Card.
            </p>
            <button className="mt-5 inline-flex items-center justify-center rounded-md bg-accent-cyan px-5 py-2 text-center text-sm font-semibold text-background">
              Select files
            </button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Required Evidence Checklist" eyebrow="Closure prerequisites" />
          <EvidenceChecklist required={selectedMap.evidenceRequired} matched={selectedEvidence.matchedRequirements} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <EvidenceValidationPanel evidence={selectedEvidence} />
        <Panel>
          <PanelHeader title="Uploaded Files" eyebrow="Department submission" />
          <div className="space-y-3">
            {evidence.map((item) => (
              <div key={item.id} className="rounded-md border border-border-default bg-surface-strong p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-text-primary">{item.fileName}</span>
                  <StatusPill status={item.validationResult} />
                </div>
                <p className="text-xs text-text-muted">
                  Uploaded by {item.uploadedBy} on {item.uploadedAt}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="inline-flex h-11 items-center justify-center rounded-md bg-accent-success px-4 text-center text-sm font-semibold text-background">
              Approve closure
            </button>
            <button className="inline-flex h-11 items-center justify-center rounded-md border border-accent-critical/35 bg-accent-critical/10 px-4 text-center text-sm font-semibold text-accent-critical">
              Request revision
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
