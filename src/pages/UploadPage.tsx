import { AlertTriangle, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { CircularMetadataCard } from "../components/upload/CircularMetadataCard";
import { ProcessingPipeline } from "../components/upload/ProcessingPipeline";
import { UploadDropzone } from "../components/upload/UploadDropzone";
import { Panel, PanelHeader } from "../components/ui/panel";
import { Button, PageContainer, PageHeader } from "../components/ui/layout";
import { circulars, regulators } from "../data/mockData";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function UploadPage() {
  const navigate = useNavigate();
  const workflow = usePipelineWorkflow();
  const circular = workflow.metadata ?? circulars[0];
  const isProcessing = workflow.status === "processing";
  const intakeComplete = workflow.status === "intake_complete";
  const hasLiveMetadata = Boolean(workflow.metadata);

  return (
    <PageContainer>
      <PageHeader eyebrow="Circular Intake" title="Upload and process regulatory circulars">
        Ingest PDFs, regulator URLs, and scanned notifications. ORBITAL extracts metadata,
        parses clauses, generates obligation JSON, validates schema, and creates MAP cards.
      </PageHeader>

      <UploadDropzone
        selectedFileName={workflow.selectedFileName}
        sourceUrl={workflow.sourceUrl}
        sourceVerified={workflow.sourceVerified}
        onSelectFile={workflow.selectFile}
        onSourceUrlChange={workflow.setSourceUrl}
        onVerifySource={workflow.verifySource}
      />

      {workflow.apiError && (
        <Panel>
          <div className="flex gap-3 rounded-md border border-accent-warning/25 bg-accent-warning/10 p-4 text-sm text-text-secondary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-warning" />
            <div>
              <p className="font-semibold text-text-primary">Pipeline needs attention</p>
              <p className="mt-1">{workflow.apiError}</p>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
        <Panel>
          <PanelHeader title="Document controls" eyebrow="Input metadata" />
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-text-secondary">Regulator</span>
              <select className="h-11 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary">
                {regulators.map((regulator) => (
                  <option key={regulator}>{regulator}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-text-secondary">Document title</span>
              <input
                className="h-11 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary"
                defaultValue={circular.title}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-text-secondary">Circular number</span>
                <input
                  className="h-11 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary"
                  defaultValue={circular.circularNumber}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-text-secondary">OCR required</span>
                <select className="h-11 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary">
                  <option>Auto-detected: yes</option>
                  <option>No OCR required</option>
                  <option>Force OCR</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3">
              {[
                ["Document checksum", "Created"],
                ["Secure repository", "Stored locally"],
                ["PII transfer", "Blocked"],
              ].map(([label, state]) => (
                <div key={label} className="flex items-center justify-between rounded-md border border-border-default bg-surface-strong p-3">
                  <span className="text-sm text-text-secondary">{label}</span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-accent-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Processing pipeline" eyebrow="Upload to MAP card generation" />
          <ProcessingPipeline steps={workflow.steps} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        {intakeComplete ? (
          <CircularMetadataCard circular={circular} />
        ) : (
          <Panel>
            <PanelHeader title="Metadata card" eyebrow="Available after intake" />
            <div className="rounded-md border border-border-default bg-surface-strong p-5">
              <p className="text-sm leading-6 text-text-secondary">
                Process a circular to reveal regulator, circular number, effective date, parsed clauses,
                extracted obligations, and validation readiness.
              </p>
            </div>
          </Panel>
        )}
        <Panel>
          <PanelHeader title="Extraction summary" eyebrow="Current run" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Summary icon={FileSearch} label="Clauses parsed" value={String(circular.totalClauses)} />
            <Summary icon={ShieldCheck} label="Obligations found" value={String(circular.totalObligations)} />
            <Summary icon={AlertTriangle} label="High-risk obligations" value={String(circular.highRiskCount)} warning />
            <Summary icon={CheckCircle2} label="JSON validation" value={hasLiveMetadata ? circular.validationStatus : "Awaiting run"} />
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-accent-cyan">Manual intake controls</p>
            <h3 className="mt-2 text-xl font-semibold text-text-primary">
              {intakeComplete ? "Metadata is ready for validation" : "Start the processing sequence"}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
              This run uploads the selected document to the FastAPI pipeline, polls backend job status,
              and loads extracted obligations plus MAP cards when processing completes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={workflow.startProcessing}
              disabled={isProcessing || !workflow.selectedFile}
              type="button"
            >
              {isProcessing ? "Processing..." : "Start processing"}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await workflow.continueValidation();
                navigate("/app/obligations");
              }}
              disabled={!intakeComplete}
              type="button"
            >
              Continue validation
            </Button>
          </div>
        </div>
      </Panel>
    </PageContainer>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  warning,
}: {
  icon: typeof FileSearch;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-md border border-border-default bg-surface-strong p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
        <Icon className={warning ? "h-4 w-4 text-accent-warning" : "h-4 w-4 text-accent-cyan"} />
        {label}
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}
