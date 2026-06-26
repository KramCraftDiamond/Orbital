import { Panel } from "./panel";

export function MetricCard({
  label,
  value,
  change,
  tone: _tone = "cyan",
}: {
  label: string;
  value: string;
  change: string;
  tone?: "cyan" | "violet" | "success" | "warning" | "critical";
}) {
  return (
    <Panel className="min-h-36">
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="mt-3 text-4xl font-semibold text-text-primary">{value}</p>
        <p className="mt-3 text-xs text-text-muted">{change}</p>
      </div>
    </Panel>
  );
}
