import { useRef } from "react";
import { EvidenceChecklist } from "../components/evidence/EvidenceChecklist";
import { EvidenceValidationPanel } from "../components/evidence/EvidenceValidationPanel";
import { DepartmentChip, RiskBadge, StatusPill } from "../components/ui/badges";
import { Button, PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function EvidencePortalPage() {
  const workflow = usePipelineWorkflow();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedMap = workflow.mapCards[0];
  const selectedEvidence =
    workflow.evidenceItems.find((item) => item.mapCardId === selectedMap?.id) ?? workflow.evidenceItems[0];

  const handleEvidenceFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (file && selectedMap) {
      await workflow.submitEvidence(selectedMap.id, file);
    }
  };

  if (!selectedMap) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Evidence Portal" title="Generate MAP cards before uploading evidence">
          Evidence validation is tied to a specific measurable action card. Run circular intake, validate
          obligations, and create MAP cards before submitting proof.
        </PageHeader>
        <Panel>
          <PanelHeader title="No MAP card selected" eyebrow="Evidence blocked" />
          <div className="rounded-md border border-border-default bg-surface-strong p-5 text-sm leading-6 text-text-secondary">
            No generated MAP cards are available in the current workflow state.
          </div>
        </Panel>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader eyebrow="Evidence Portal" title="Validate proof against regulatory obligations">
        Departments upload evidence against MAP Cards. ORBITAL compares the proof against the original obligation,
        identifies matched and missing requirements, then routes the result for human approval.
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
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
            <Button variant="primary" className="mt-5" onClick={() => fileInputRef.current?.click()} type="button">
              Select files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv,.log,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(event) => handleEvidenceFile(event.target.files)}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Required Evidence Checklist" eyebrow="Closure prerequisites" />
          <EvidenceChecklist required={selectedMap.evidenceRequired} matched={selectedEvidence?.matchedRequirements ?? []} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        {selectedEvidence && <EvidenceValidationPanel evidence={selectedEvidence} />}
        <Panel>
          <PanelHeader title="Uploaded Files" eyebrow="Department submission" />
          <div className="space-y-3">
            {workflow.evidenceItems.map((item) => (
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
            <Button variant="success" type="button">
              Approve closure
            </Button>
            <Button variant="danger" type="button">
              Request revision
            </Button>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
