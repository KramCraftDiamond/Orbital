import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { AuditEvent } from "../../types/orbital";
import { RiskBadge } from "../ui/badges";

export function AuditEventCard({ event }: { event: AuditEvent }) {
  return (
    <article className="rounded-lg border border-border-default bg-surface-base p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border-default bg-bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase text-text-secondary">
              {event.id}
            </span>
            <span className="rounded-md border border-border-default bg-surface-elevated px-2.5 py-1 text-[10px] uppercase text-text-secondary">
              {event.entityType}
            </span>
            {event.severity && <RiskBadge severity={event.severity} />}
          </div>
          <h3 className="text-lg font-semibold text-text-primary">{event.action}</h3>
          <p className="mt-2 text-sm text-text-secondary">{event.details}</p>
        </div>
        <div className="rounded-md bg-accent-success/10 p-2 text-accent-success">
          <LockKeyhole className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <LedgerItem label="Timestamp" value={event.timestamp} />
        <LedgerItem label="Actor" value={event.actor} />
        <LedgerItem label="Entity" value={event.entityId} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <HashBlock label="Event hash" value={event.eventHash} />
        <HashBlock label="Previous hash" value={event.previousHash} />
      </div>
    </article>
  );
}

function LedgerItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-secondary p-3">
      <p className="text-[10px] font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function HashBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-default bg-[#030712] p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase text-text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-accent-success" />
        {label}
      </div>
      <p className="break-all font-mono text-xs leading-5 text-[#c4d7f2]">{value}</p>
    </div>
  );
}
