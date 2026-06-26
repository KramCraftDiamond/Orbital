import type { AuditEvent } from "../../types/orbital";
import { AuditEventCard } from "./AuditEventCard";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="relative space-y-5 pl-7">
      <div className="absolute bottom-0 left-2 top-2 w-px bg-border-strong" />
      {events.map((event) => (
        <div key={event.id} className="relative">
          <span className="absolute -left-[26px] top-6 h-4 w-4 rounded-full border border-accent-cyan bg-background shadow-[0_0_18px_rgba(65,45,21,0.22)]" />
          <AuditEventCard event={event} />
        </div>
      ))}
    </div>
  );
}
