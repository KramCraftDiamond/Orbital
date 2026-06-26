import { Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { AuditTimeline } from "../components/audit/AuditTimeline";
import { Panel, PanelHeader } from "../components/ui/panel";
import { auditEvents } from "../data/mockData";

export function AuditTrailPage() {
  const latest = auditEvents[auditEvents.length - 1];

  return (
    <div className="space-y-6 p-5 xl:p-8">
      <div>
        <p className="text-xs font-semibold uppercase text-accent-cyan">Immutable Audit Trail</p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">Defensible compliance event chain</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          Every circular, extracted obligation, MAP Card assignment, evidence submission, AI validation,
          and human decision is recorded with timestamps, actors, event IDs, and chained hashes.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <AuditTimeline events={auditEvents} />

        <aside className="space-y-6">
          <Panel>
            <PanelHeader title="Hash Integrity" eyebrow="Current chain status" />
            <div className="space-y-4">
              <div className="rounded-md border border-border-default bg-[#030712] p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Current event hash</p>
                <p className="break-all font-mono text-xs leading-5 text-[#c4d7f2]">{latest.eventHash}</p>
              </div>
              <div className="rounded-md border border-border-default bg-[#030712] p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Previous event hash</p>
                <p className="break-all font-mono text-xs leading-5 text-[#c4d7f2]">{latest.previousHash}</p>
              </div>
              <div className="rounded-md border border-accent-success/25 bg-accent-success/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent-success">
                  <ShieldCheck className="h-4 w-4" />
                  Chain verified
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Last verification: 2026-05-22 14:35:42
                </p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Ledger Statistics" eyebrow="Activity" />
            <div className="space-y-3">
              <Stat icon={Fingerprint} label="Total events" value="1,247" />
              <Stat icon={LockKeyhole} label="Today" value="23" />
              <Stat icon={ShieldCheck} label="Chain verified" value="100%" />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Fingerprint;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-strong p-4">
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <Icon className="h-4 w-4 text-accent-cyan" />
        {label}
      </span>
      <span className="text-xl font-semibold text-text-primary">{value}</span>
    </div>
  );
}
