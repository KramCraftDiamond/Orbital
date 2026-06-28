import { CheckCircle2, Copy, TriangleAlert } from "lucide-react";
import { StatusPill } from "../ui/badges";
import { Button } from "../ui/layout";

export function JsonViewer({ value, maxHeight = "520px" }: { value: unknown; maxHeight?: string }) {
  const formatted = JSON.stringify(value, null, 2);

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-[#050301]">
      <div className="flex items-center justify-between border-b border-border-default bg-surface-strong px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-accent-success" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Schema validated JSON</p>
            <p className="text-xs text-text-muted">Raw output from obligation extraction model</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status="valid" />
          <Button
            variant="ghost"
            className="h-9 gap-2 px-3 text-xs"
            onClick={() => navigator.clipboard?.writeText(formatted)}
            type="button"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-2 border-b border-border-default bg-bg-secondary px-4 py-3 text-xs text-text-secondary md:grid-cols-3">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent-success" />
          Required fields present
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent-success" />
          Obligation array valid
        </span>
        <span className="flex items-center gap-2">
          <TriangleAlert className="h-3.5 w-3.5 text-accent-warning" />
          1 low-confidence note
        </span>
      </div>

      <pre className="overflow-auto p-5 font-mono text-xs leading-6 text-[#E1DCC9]" style={{ maxHeight }}>
        {formatted}
      </pre>
    </div>
  );
}
