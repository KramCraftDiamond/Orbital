import { useEffect, useRef, useState } from "react";
import { EvidenceChecklist } from "../components/evidence/EvidenceChecklist";
import { EvidenceValidationPanel } from "../components/evidence/EvidenceValidationPanel";
import { DepartmentChip, RiskBadge, StatusPill } from "../components/ui/badges";
import { Button, PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { closeMapCard } from "../services/pipelineApi";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function EvidencePortalPage() {
  const workflow = usePipelineWorkflow();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedMapId, setSelectedMapId] = useState(workflow.mapCards[0]?.id ?? "");
  const [closureState, setClosureState] = useState<"idle" | "closing" | "closed" | "error">("idle");
  const [closureMessage, setClosureMessage] = useState("");
  const selectedMap =
    workflow.mapCards.find((card) => card.id === selectedMapId) ?? workflow.mapCards[0];
  const selectedEvidenceItems = selectedMap
    ? workflow.evidenceItems.filter((item) => item.mapCardId === selectedMap.id)
    : [];
  const selectedEvidence = selectedEvidenceItems[0];

  useEffect(() => {
    if (!workflow.mapCards.some((card) => card.id === selectedMapId)) {
      setSelectedMapId(workflow.mapCards[0]?.id ?? "");
      setClosureState("idle");
      setClosureMessage("");
    }
  }, [selectedMapId, workflow.mapCards]);

  const handleEvidenceFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (file && selectedMap && closureState !== "closed") {
      await workflow.submitEvidence(selectedMap.id, file);
    }
  };

  const handleApproveClosure = async () => {
    if (!selectedMap) return;
    setClosureState("closing");
    setClosureMessage("");
    try {
      const response = await closeMapCard(selectedMap.id, selectedEvidence?.id ?? "");
      setClosureState("closed");
      setClosureMessage(
        `${response.mapCardId} closed with ${response.completedTasks.length} department task(s) completed.`,
      );
    } catch (error) {
      setClosureState("error");
      setClosureMessage(error instanceof Error ? error.message : "Closure failed.");
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

      {workflow.mapCards.length > 1 && (
        <Panel>
          <PanelHeader title="MAP card selector" eyebrow={`${workflow.mapCards.length} generated cards`} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workflow.mapCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedMapId(card.id);
                  setClosureState("idle");
                  setClosureMessage("");
                }}
                className={`rounded-md border p-4 text-left transition-colors ${
                  card.id === selectedMap.id
                    ? "border-border-active bg-accent-cyan/10"
                    : "border-border-default bg-surface-strong hover:border-border-active"
                }`}
              >
                <p className="font-mono text-[10px] uppercase text-text-muted">{card.id}</p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-text-primary">{card.title}</p>
                <p className="mt-2 text-xs text-text-muted">{card.owner}</p>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {closureMessage && (
        <Panel>
          <div
            className={`rounded-md border p-4 text-sm ${
              closureState === "error"
                ? "border-accent-critical/25 bg-accent-critical/10 text-accent-critical"
                : "border-accent-success/25 bg-accent-success/10 text-text-secondary"
            }`}
          >
            {closureMessage}
          </div>
        </Panel>
      )}

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
            <Button
              variant="primary"
              className="mt-5"
              onClick={() => fileInputRef.current?.click()}
              disabled={closureState === "closed"}
              type="button"
            >
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
            {selectedEvidenceItems.length ? selectedEvidenceItems.map((item) => (
              <div key={item.id} className="rounded-md border border-border-default bg-surface-strong p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-text-primary">{item.fileName}</span>
                  <StatusPill status={item.validationResult} />
                </div>
                <p className="text-xs text-text-muted">
                  Uploaded by {item.uploadedBy} on {item.uploadedAt}
                </p>
              </div>
            )) : (
              <div className="rounded-md border border-border-default bg-surface-strong p-4 text-sm text-text-secondary">
                No evidence has been submitted for this MAP card yet.
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              variant="success"
              disabled={closureState === "closing" || closureState === "closed"}
              onClick={handleApproveClosure}
              type="button"
            >
              {closureState === "closing" ? "Closing..." : closureState === "closed" ? "Closure approved" : "Approve closure"}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setClosureState("idle");
                setClosureMessage("Revision requested. Departments can submit updated evidence.");
              }}
              type="button"
            >
              Request revision
            </Button>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
