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
    <Panel className="min-h-32">
      <div className="flex h-full flex-col justify-between">
        <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
        <p className="mt-3 text-3xl font-semibold text-text-primary">{value}</p>
        <p className="mt-3 text-sm text-text-secondary">{change}</p>
      </div>
    </Panel>
  );
}
