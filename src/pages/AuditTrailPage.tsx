import { Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { AuditTimeline } from "../components/audit/AuditTimeline";
import { PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

export function AuditTrailPage() {
  const workflow = usePipelineWorkflow();
  const auditEvents = workflow.auditEvents;
  const latest = auditEvents[auditEvents.length - 1];
  const todayKey = new Date().toISOString().slice(0, 10);
  const eventsToday = auditEvents.filter((event) => event.timestamp.slice(0, 10) === todayKey).length;
  const chainLabel = workflow.auditVerified ? "Chain verified" : "Review required";
  const chainTone = workflow.auditVerified ? "text-accent-success" : "text-accent-warning";

  return (
    <PageContainer>
      <PageHeader eyebrow="Immutable Audit Trail" title="Defensible compliance event chain">
        Every circular, extracted obligation, MAP Card assignment, evidence submission, AI validation,
        and human decision is recorded with timestamps, actors, event IDs, and chained hashes.
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AuditTimeline events={auditEvents} />

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel>
            <PanelHeader title="Hash Integrity" eyebrow="Current chain status" />
            <div className="space-y-4">
              <div className="rounded-md border border-border-default bg-[#050301] p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Current event hash</p>
                <p className="break-all font-mono text-xs leading-5 text-[#E1DCC9]">{latest?.eventHash ?? "No events recorded"}</p>
              </div>
              <div className="rounded-md border border-border-default bg-[#050301] p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Previous event hash</p>
                <p className="break-all font-mono text-xs leading-5 text-[#E1DCC9]">{latest?.previousHash ?? "N/A"}</p>
              </div>
              <div className="rounded-md border border-accent-success/25 bg-accent-success/10 p-4">
                <div className={`flex items-center gap-2 text-sm font-semibold ${chainTone}`}>
                  <ShieldCheck className="h-4 w-4" />
                  {chainLabel}
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Last event: {latest?.timestamp ?? "No audit event yet"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Ledger Statistics" eyebrow="Activity" />
            <div className="space-y-3">
              <Stat icon={Fingerprint} label="Total events" value={String(auditEvents.length)} />
              <Stat icon={LockKeyhole} label="Today" value={String(eventsToday)} />
              <Stat icon={ShieldCheck} label="Chain verified" value={workflow.auditVerified ? "Yes" : "No"} />
            </div>
          </Panel>
        </aside>
      </div>
    </PageContainer>
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
