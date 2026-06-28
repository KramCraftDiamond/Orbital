import { useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { EvidenceChecklist } from "../components/evidence/EvidenceChecklist";
import { EvidenceValidationPanel } from "../components/evidence/EvidenceValidationPanel";
import { DepartmentChip, RiskBadge, StatusPill } from "../components/ui/badges";
import { Button, PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";
import { closeMapCard } from "../services/pipelineApi";

export function EvidencePortalPage() {
  const workflow = usePipelineWorkflow();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── MAP card selector (was always hardcoded to [0]) ──────────────────────
  const [selectedMapId, setSelectedMapId] = useState<string>(workflow.mapCards[0]?.id ?? "");
  const selectedMap = workflow.mapCards.find((c) => c.id === selectedMapId) ?? workflow.mapCards[0];

  const selectedEvidence =
    workflow.evidenceItems.find((item) => item.mapCardId === selectedMap?.id) ??
    workflow.evidenceItems[0];

  // ── Closure state ─────────────────────────────────────────────────────────
  const [closureStatus, setClosureStatus] = useState<"idle" | "closing" | "closed" | "error">("idle");
  const [closureMessage, setClosureMessage] = useState("");

  const handleEvidenceFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (file && selectedMap) {
      await workflow.submitEvidence(selectedMap.id, file);
    }
  };

  const handleApprove = async () => {
    if (!selectedMap) return;
    setClosureStatus("closing");
    try {
      const evidenceRef = selectedEvidence?.id ?? "";
      await closeMapCard(selectedMap.id, evidenceRef);
      setClosureStatus("closed");
      setClosureMessage(
        `MAP card ${selectedMap.id} approved and closed. ${selectedEvidence ? `Evidence: ${selectedEvidence.id}` : ""}`,
      );
    } catch (err) {
      setClosureStatus("error");
      setClosureMessage(err instanceof Error ? err.message : "Closure failed.");
    }
  };

  const handleRevision = () => {
    setClosureStatus("idle");
    setClosureMessage("");
    // Reset evidence for this card so the department can re-submit
    workflow.submitEvidence(selectedMap?.id ?? "", new File([], ""));
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

      {/* ── MAP card selector ─────────────────────────────────────────────── */}
      {workflow.mapCards.length > 1 && (
        <Panel>
          <PanelHeader title="Select MAP Card" eyebrow={`${workflow.mapCards.length} cards available`} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workflow.mapCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedMapId(card.id);
                  setClosureStatus("idle");
                  setClosureMessage("");
                }}
                className={`rounded-md border p-4 text-left transition-colors ${
                  card.id === selectedMap.id
                    ? "border-border-active bg-[#412D15] text-[#E1DCC9]"
                    : "border-border-default bg-surface-strong hover:border-border-active"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <RiskBadge severity={card.severity} />
                  <StatusPill status={card.status} />
                </div>
                <p className="line-clamp-2 text-sm font-semibold">{card.title}</p>
                <p className="mt-2 text-xs text-text-muted">{card.id}</p>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Closure status banner ─────────────────────────────────────────── */}
      {closureStatus === "closed" && (
        <div className="flex items-center gap-3 rounded-md border border-accent-success/25 bg-accent-success/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-success" />
          <div>
            <p className="font-semibold text-text-primary">MAP card closed</p>
            <p className="mt-1 text-sm text-text-secondary">{closureMessage}</p>
          </div>
        </div>
      )}
      {closureStatus === "error" && (
        <div className="flex items-center gap-3 rounded-md border border-accent-warning/25 bg-accent-warning/10 p-4">
          <XCircle className="h-5 w-5 shrink-0 text-accent-warning" />
          <div>
            <p className="font-semibold text-text-primary">Closure failed</p>
            <p className="mt-1 text-sm text-text-secondary">{closureMessage}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel>
          <PanelHeader title="Selected MAP Card" eyebrow={selectedMap.id} />
          <div className="mb-4 flex flex-wrap gap-2">
            <RiskBadge severity={selectedMap.severity} />
            <StatusPill status={closureStatus === "closed" ? "Closed" : selectedMap.status} />
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
              type="button"
              disabled={closureStatus === "closed"}
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
            {workflow.evidenceItems
              .filter((item) => item.mapCardId === selectedMap.id || !item.mapCardId)
              .map((item) => (
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

          {/* ── Wired closure controls ──────────────────────────────────── */}
          <div className="mt-6 rounded-md border border-accent-cyan/25 bg-accent-cyan/10 p-4">
            <div className="text-sm font-semibold text-accent-cyan">Human sign-off remains mandatory</div>
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              AI can recommend closure, rejection, or escalation. Compliance officers make the final decision.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button
              variant="success"
              type="button"
              disabled={closureStatus === "closing" || closureStatus === "closed"}
              onClick={handleApprove}
            >
              {closureStatus === "closing" ? "Closing…" : closureStatus === "closed" ? "Closed ✓" : "Approve closure"}
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={closureStatus === "closing"}
              onClick={handleRevision}
            >
              Request revision
            </Button>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
