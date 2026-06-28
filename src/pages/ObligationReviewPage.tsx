import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { JsonViewer } from "../components/obligations/JsonViewer";
import { DepartmentChip, RiskBadge, StatusPill } from "../components/ui/badges";
import { Button, InfoRow, PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { obligationJsonPreview } from "../data/mockData";
import { cn } from "../lib/ui";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function ObligationReviewPage() {
  const navigate = useNavigate();
  const workflow = usePipelineWorkflow();
  const activeObligations = workflow.obligations;
  const [selectedId, setSelectedId] = useState(activeObligations[0]?.id ?? "");
  const selected = useMemo(
    () => activeObligations.find((obligation) => obligation.id === selectedId) ?? activeObligations[0],
    [activeObligations, selectedId],
  );
  const jsonPreview = workflow.rawObligations.length
    ? {
        document: workflow.metadata,
        obligations: workflow.rawObligations,
      }
    : obligationJsonPreview;
  const hasValidationRun = workflow.validationScore > 0;
  const aboveThreshold = workflow.validationScore >= workflow.validationThreshold;
  const needsRepair = workflow.validationIssues.some((issue) => issue.severity === "failed");
  const isRepairing = workflow.status === "repair_running";
  const isGeneratingMaps = workflow.status === "map_generating";

  useEffect(() => {
    if (!activeObligations.some((obligation) => obligation.id === selectedId)) {
      setSelectedId(activeObligations[0]?.id ?? "");
    }
  }, [activeObligations, selectedId]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Obligation Review"
        title="Validate extracted obligations before MAP generation"
        action={
          <>
            <Button variant="secondary" type="button">Export schema output</Button>
            <Button
              variant="primary"
              onClick={async () => {
                await workflow.createMapCards();
                navigate("/app/maps");
              }}
              disabled={!aboveThreshold || needsRepair || isGeneratingMaps}
              type="button"
            >
              {isGeneratingMaps ? "Creating MAP..." : "Create MAP cards"}
            </Button>
          </>
        }
      >
        Review source clauses, department mapping, confidence, evidence requirements, and validation findings before
        committing obligations into MAP cards.
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden">
          <PanelHeader title="Obligation Queue" eyebrow={`${activeObligations.length} extracted`} />
          <div className="space-y-3 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1">
            {activeObligations.map((obligation) => (
              <button
                key={obligation.id}
                type="button"
                onClick={() => setSelectedId(obligation.id)}
                className={cn(
                  "w-full rounded-md border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan",
                  selected?.id === obligation.id
                    ? "border-border-active bg-[#412D15] text-[#E1DCC9]"
                    : "border-border-default bg-surface-strong hover:border-border-active hover:bg-surface-elevated",
                )}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[10px] uppercase",
                      selected?.id === obligation.id
                        ? "border-[#E1DCC9]/25 bg-[#E1DCC9]/10 text-[#E1DCC9]/80"
                        : "border-border-default bg-bg-secondary text-text-muted",
                    )}
                  >
                    {obligation.id}
                  </span>
                  <RiskBadge severity={obligation.severity} />
                </div>
                <p
                  className={cn(
                    "line-clamp-2 text-sm font-semibold leading-5",
                    selected?.id === obligation.id ? "text-[#E1DCC9]" : "text-text-primary",
                  )}
                >
                  {obligation.actionRequired}
                </p>
                <div
                  className={cn(
                    "mt-3 flex items-center justify-between gap-3 text-xs",
                    selected?.id === obligation.id ? "text-[#E1DCC9]/62" : "text-text-muted",
                  )}
                >
                  <span>{obligation.sourceClause}</span>
                  <span>{Math.round(obligation.confidence * 100)}%</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="min-w-0 space-y-6">
          {selected && (
            <Panel>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-border-default bg-bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase text-text-secondary">
                      {selected.id}
                    </span>
                    <RiskBadge severity={selected.severity} />
                    <StatusPill status={selected.validationStatus} />
                  </div>
                  <h3 className="text-2xl font-semibold leading-tight text-text-primary">
                    {selected.actionRequired}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{selected.sourceText}</p>
                </div>
                <div className="rounded-md bg-accent-cyan/10 p-3 text-accent-cyan">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <InfoRow label="Source clause" value={selected.sourceClause} />
                <InfoRow label="Deadline" value={selected.deadline} />
                <InfoRow label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-md border border-border-default bg-surface-strong p-4">
                  <p className="mb-3 text-xs font-semibold uppercase text-text-muted">Responsible departments</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.departments.map((department) => (
                      <DepartmentChip key={department} department={department} />
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-border-default bg-surface-strong p-4">
                  <p className="mb-3 text-xs font-semibold uppercase text-text-muted">Evidence required</p>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    {selected.evidenceRequired.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-cyan" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 rounded-md border border-border-default bg-bg-secondary p-4">
                <p className="text-xs font-semibold uppercase text-text-muted">Policy impact</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{selected.policyImpact}</p>
              </div>
            </Panel>
          )}

          <Panel>
            <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
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
                    <FindingIntro
                      icon={AlertTriangle}
                      title="Human suggestion required before repair"
                      copy="The validation engine caught an issue above the threshold. Add guidance and run repair to restart from obligation extraction."
                      warning
                    />
                    <textarea
                      className="min-h-24 w-full rounded-md border border-border-default bg-bg-secondary p-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-border-active"
                      value={workflow.suggestion}
                      onChange={(event) => workflow.setSuggestion(event.target.value)}
                      placeholder="Example: include deletion approval controls and add Internal Audit as reviewer."
                    />
                    <Button variant="warning" onClick={workflow.repairValidation} disabled={isRepairing} type="button">
                      {isRepairing ? "Repairing..." : "Repair and rerun extraction"}
                    </Button>
                  </div>
                ) : aboveThreshold ? (
                  <FindingIntro
                    icon={CheckCircle2}
                    title="Validation is below the error threshold"
                    copy="The obligations are ready for MAP card generation using the validated JSON, department mapping, evidence list, and source clauses."
                  />
                ) : (
                  <FindingIntro
                    icon={AlertTriangle}
                    title="No active validation result"
                    copy="Use the upload flow first, then continue validation to populate this repair panel."
                    warning
                  />
                )}
              </div>
            </div>
          </Panel>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <JsonViewer value={jsonPreview} maxHeight="460px" />
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
    </PageContainer>
  );
}

function FindingIntro({
  icon: Icon,
  title,
  copy,
  warning,
}: {
  icon: typeof CheckCircle2;
  title: string;
  copy: string;
  warning?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <Icon className={warning ? "mt-1 h-5 w-5 shrink-0 text-accent-warning" : "mt-1 h-5 w-5 shrink-0 text-accent-success"} />
      <div>
        <p className="font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-text-secondary">{copy}</p>
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
        <p className="mt-1 text-sm leading-6 text-text-secondary">{copy}</p>
      </div>
    </div>
  );
}
