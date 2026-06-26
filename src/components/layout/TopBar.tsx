import { Bell, Command, LockKeyhole, Search, ShieldCheck } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-[#F8F3E2]/84 px-5 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase text-text-muted">Suraksha Hackathon prototype</p>
          <h1 className="mt-1 text-lg font-semibold text-text-primary">
            Regulation to action. Action to proof.
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative hidden min-w-80 xl:block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              className="h-10 w-full rounded-md border border-border-default bg-white/28 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted"
              placeholder="Search circular, MAP card, obligation, audit event"
            />
          </label>
          <span className="inline-flex h-10 items-center gap-2 rounded-md border border-accent-success/25 bg-accent-success/10 px-3 text-xs font-semibold text-accent-success">
            <LockKeyhole className="h-3.5 w-3.5" />
            On-prem mode
          </span>
          <span className="inline-flex h-10 items-center gap-2 rounded-md border border-border-default bg-surface-elevated px-3 text-xs text-text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-cyan" />
            Audit chain locked
          </span>
          <button className="flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-elevated text-text-secondary">
            <Command className="h-4 w-4" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-elevated text-text-secondary">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
