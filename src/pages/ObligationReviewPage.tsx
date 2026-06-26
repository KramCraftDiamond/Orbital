import { AlertTriangle, CheckCircle2, FileJson2 } from "lucide-react";
import { ObligationCard } from "../components/obligations/ObligationCard";
import { JsonViewer } from "../components/obligations/JsonViewer";
import { Panel, PanelHeader } from "../components/ui/panel";
import { obligationJsonPreview, obligations } from "../data/mockData";

export function ObligationReviewPage() {
  return (
    <div className="space-y-6 p-5 xl:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-accent-cyan">Obligation Review</p>
          <h2 className="mt-2 text-3xl font-semibold text-text-primary">Validated regulatory obligation JSON</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
            Review extracted obligations, source clauses, deadline risk, assigned departments,
            evidence requirements, and the strict machine-readable JSON used by the workflow engine.
          </p>
        </div>
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent-cyan px-4 text-sm font-semibold text-background">
          <FileJson2 className="h-4 w-4" />
          Export schema output
        </button>
      </div>

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
              <Finding icon={AlertTriangle} title="Manual review advised" copy="IRDAI data governance obligation has lower confidence because applicability language is broad." />
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
