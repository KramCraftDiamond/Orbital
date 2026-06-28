import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { Evidence } from "../../types/orbital";
import { StatusPill } from "../ui/badges";

export function EvidenceValidationPanel({ evidence }: { evidence: Evidence }) {
  const isPass = evidence.validationResult === "Pass";
  const Icon = isPass ? CheckCircle2 : evidence.validationResult === "Fail" ? ShieldAlert : AlertTriangle;
  const contradicted = evidence.contradictedRequirements ?? [];
  const snippets = evidence.sourceSnippets ?? [];

  return (
    <div className="rounded-lg border border-border-default bg-surface-base p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <StatusPill status={evidence.validationResult} />
            {evidence.requiresHumanReview && <StatusPill status="Human sign-off required" />}
          </div>
          <h3 className="text-xl font-semibold text-text-primary">AI validation result</h3>
          <p className="mt-2 text-sm text-text-secondary">{evidence.recommendation}</p>
        </div>
        <div className={isPass ? "rounded-md bg-accent-success/10 p-2 text-accent-success" : "rounded-md bg-accent-warning/10 p-2 text-accent-warning"}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-accent-success/25 bg-accent-success/5 p-4">
          <p className="text-xs font-semibold uppercase text-accent-success">Matched requirements</p>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {evidence.matchedRequirements.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-accent-warning/25 bg-accent-warning/5 p-4">
          <p className="text-xs font-semibold uppercase text-accent-warning">Missing requirements</p>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {evidence.missingRequirements.length ? (
              evidence.missingRequirements.map((item) => (
                <li key={item} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-accent-warning" />
                  {item}
                </li>
              ))
            ) : (
              <li>No missing requirements detected. Human approval remains required.</li>
            )}
          </ul>
        </div>
      </div>

      {contradicted.length > 0 && (
        <div className="mt-4 rounded-md border border-accent-warning/25 bg-accent-warning/5 p-4">
          <p className="text-xs font-semibold uppercase text-accent-warning">Possible contradictions</p>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {contradicted.map((item) => (
              <li key={item} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-accent-warning" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {snippets.length > 0 && (
        <div className="mt-4 rounded-md border border-border-default bg-bg-secondary p-4">
          <p className="text-xs font-semibold uppercase text-text-muted">Evidence snippets</p>
          <div className="mt-3 space-y-3">
            {snippets.map((item) => (
              <div key={`${item.requirement}-${item.status}`} className="rounded-md border border-border-default bg-surface-strong p-3">
                <p className="text-xs font-semibold uppercase text-text-muted">{item.status}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{item.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
