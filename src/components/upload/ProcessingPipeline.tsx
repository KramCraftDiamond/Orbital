import { CheckCircle2, Circle, Loader2, TriangleAlert } from "lucide-react";
import type { ProcessingStep } from "../../types/orbital";
import { cn, statusClasses } from "../../lib/ui";

function StepIcon({ status }: { status: ProcessingStep["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-accent-success" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />;
  if (status === "failed" || status === "review") return <TriangleAlert className="h-4 w-4 text-accent-warning" />;
  return <Circle className="h-4 w-4 text-text-muted" />;
}

export function ProcessingPipeline({ steps }: { steps: ProcessingStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className="grid gap-3 rounded-md border border-border-default bg-surface-strong p-4 md:grid-cols-[32px_1fr_auto]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-secondary">
            <StepIcon status={step.status} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-text-primary">{step.label}</p>
              <span className="text-xs text-text-muted">Step {index + 1}</span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {step.duration && <span className="font-mono text-xs text-text-muted">{step.duration}</span>}
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase",
                statusClasses(step.status),
              )}
            >
              {step.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
