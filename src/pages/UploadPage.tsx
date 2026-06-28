import { AlertTriangle, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { CircularMetadataCard } from "../components/upload/CircularMetadataCard";
import { ProcessingPipeline } from "../components/upload/ProcessingPipeline";
import { UploadDropzone } from "../components/upload/UploadDropzone";
import { Panel, PanelHeader } from "../components/ui/panel";
import { circulars, regulators } from "../data/mockData";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function UploadPage() {
  const navigate = useNavigate();
  const workflow = usePipelineWorkflow();
  const circular = workflow.metadata ?? circulars[0];
  const isProcessing = workflow.status === "processing";
  const intakeComplete = workflow.status === "intake_complete";

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-5 xl:p-8">
      <div>
        <p className="text-xs font-semibold uppercase text-accent-cyan">Circular Intake</p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">Upload and process regulatory circulars</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          Ingest PDFs, regulator URLs, and scanned notifications. ORBITAL extracts metadata,
          parses clauses, generates obligation JSON, validates schema, and creates MAP cards.
        </p>
      </div>

      <UploadDropzone
        selectedFileName={workflow.selectedFileName}
        sourceUrl={workflow.sourceUrl}
        sourceVerified={workflow.sourceVerified}
        onSelectFile={workflow.selectFile}
        onSourceUrlChange={workflow.setSourceUrl}
        onVerifySource={workflow.verifySource}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.2fr]">
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

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
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
            <Summary icon={CheckCircle2} label="JSON validation" value="Schema valid" />
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
              This mocked control path mirrors the backend sequence so every button has a destination
              before the API wrapper is available.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent-cyan px-5 text-center text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-55"
              onClick={workflow.startProcessing}
              disabled={isProcessing}
              type="button"
            >
              {isProcessing ? "Processing..." : "Start processing"}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center rounded-md border border-border-default bg-surface-elevated px-5 text-center text-sm font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-55"
              onClick={async () => {
                await workflow.continueValidation();
                navigate("/app/obligations");
              }}
              disabled={!intakeComplete}
              type="button"
            >
              Continue validation
            </button>
          </div>
        </div>
      </Panel>
    </div>
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
