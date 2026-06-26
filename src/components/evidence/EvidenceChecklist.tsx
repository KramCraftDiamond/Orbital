import { CheckCircle2, Circle } from "lucide-react";

export function EvidenceChecklist({
  required,
  matched,
}: {
  required: string[];
  matched: string[];
}) {
  return (
    <div className="space-y-3">
      {required.map((item) => {
        const complete = matched.includes(item);
        return (
          <div
            key={item}
            className="flex items-start gap-3 rounded-md border border-border-default bg-surface-strong p-3"
          >
            {complete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent-success" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 text-text-muted" />
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">{item}</p>
              <p className="mt-1 text-xs text-text-muted">
                {complete ? "Matched by uploaded evidence" : "Still required before closure"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
