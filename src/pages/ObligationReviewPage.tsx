import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { ObligationCard } from "../components/obligations/ObligationCard";
import { JsonViewer } from "../components/obligations/JsonViewer";
import { Panel, PanelHeader } from "../components/ui/panel";
import { obligationJsonPreview, obligations } from "../data/mockData";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function ObligationReviewPage() {
  const navigate = useNavigate();
  const workflow = usePipelineWorkflow();
  const hasValidationRun = workflow.validationScore > 0;
  const aboveThreshold = workflow.validationScore >= workflow.validationThreshold;
  const needsRepair = workflow.validationIssues.some((issue) => issue.severity === "failed");
  const isRepairing = workflow.status === "repair_running";
  const isGeneratingMaps = workflow.status === "map_generating";

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-5 xl:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-accent-cyan">Obligation Review</p>
          <h2 className="mt-2 text-3xl font-semibold text-text-primary">Validated regulatory obligation JSON</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
            Review extracted obligations, source clauses, deadline risk, assigned departments,
            evidence requirements, and the strict machine-readable JSON used by the workflow engine.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex h-11 items-center justify-center rounded-md border border-border-default bg-surface-elevated px-5 text-center text-sm font-semibold text-text-primary">
            Export schema output
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent-cyan px-5 text-center text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-55"
            onClick={async () => {
              await workflow.createMapCards();
              navigate("/app/maps");
            }}
            disabled={!aboveThreshold || needsRepair || isGeneratingMaps}
            type="button"
          >
            {isGeneratingMaps ? "Creating MAP..." : "Create MAP cards"}
          </button>
        </div>
      </div>

      <Panel>
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-accent-cyan">Validation threshold</p>
            <h3 className="mt-2 text-xl font-semibold text-text-primary">
              {hasValidationRun ? `${Math.round(workflow.validationScore * 100)}% confidence` : "Validation not started"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              MAP cards can be generated once validation confidence reaches{" "}
              {Math.round(workflow.validationThreshold * 100)}% and no blocking repair issue remains.
            </p>
          </div>
          <div className="rounded-md border border-border-default bg-surface-strong p-4">
            {needsRepair ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-accent-warning" />
                  <div>
                    <p className="font-semibold text-text-primary">Human suggestion required before repair</p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      The validation engine caught an issue above the threshold. Add guidance and run
                      repair to restart the workflow from obligation extraction.
                    </p>
                  </div>
                </div>
                <textarea
                  className="min-h-24 w-full rounded-md border border-border-default bg-bg-secondary p-3 text-sm text-text-primary placeholder:text-text-muted"
                  value={workflow.suggestion}
                  onChange={(event) => workflow.setSuggestion(event.target.value)}
                  placeholder="Example: include deletion approval controls and add Internal Audit as reviewer."
                />
                <button
                  className="inline-flex h-11 items-center justify-center rounded-md bg-accent-warning px-5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-55"
                  onClick={workflow.repairValidation}
                  disabled={isRepairing}
                  type="button"
                >
                  {isRepairing ? "Repairing..." : "Repair and rerun extraction"}
                </button>
              </div>
            ) : aboveThreshold ? (
              <div className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent-success" />
                <div>
                  <p className="font-semibold text-text-primary">Validation is below the error threshold</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    The obligations are ready for MAP card generation. The generated cards will use the
                    validated JSON, department mapping, evidence list, and source clauses.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-accent-warning" />
                <div>
                  <p className="font-semibold text-text-primary">No active validation result</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Use the upload flow first, then continue validation to populate this repair panel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          {obligations.map((obligation) => (
            <ObligationCard key={obligation.id} obligation={obligation} />
          ))}
        </div>

        <div className="space-y-6">
          <JsonViewer value={obligationJsonPreview} />
          <Panel>
            <PanelHeader title="Validation Findings" eyebrow="Field-level review" />
            <div className="space-y-3">
              <Finding icon={CheckCircle2} title="Schema valid" copy="document_metadata and obligations arrays match the ORBITAL extraction schema." good />
              <Finding icon={CheckCircle2} title="Source clause references present" copy="Every obligation is traceable to a circular clause or paragraph." good />
              {workflow.validationIssues.length > 0 ? (
                workflow.validationIssues.map((issue) => (
                  <Finding
                    key={issue.id}
                    icon={AlertTriangle}
                    title={`${issue.id}: ${issue.obligationId} ${issue.field}`}
                    copy={`${issue.reason} Current value: ${issue.currentValue}`}
                  />
                ))
              ) : (
                <Finding icon={CheckCircle2} title="Repair loop clear" copy="No blocking validation issues are active." good />
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Finding({
  icon: Icon,
  title,
  copy,
  good,
}: {
  icon: typeof CheckCircle2;
  title: string;
  copy: string;
  good?: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border-default bg-surface-strong p-4">
      <Icon className={good ? "mt-0.5 h-4 w-4 text-accent-success" : "mt-0.5 h-4 w-4 text-accent-warning"} />
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{copy}</p>
      </div>
    </div>
  );
}
