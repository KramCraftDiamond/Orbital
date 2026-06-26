import { MAPCard } from "../components/map-cards/MAPCard";
import { Panel, PanelHeader } from "../components/ui/panel";
import { mapCards } from "../data/mockData";

export function MAPCardsPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-5 xl:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-accent-cyan">MAP Card Task Feed</p>
          <h2 className="mt-2 text-3xl font-semibold text-text-primary">Generated compliance execution cards</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
            MAP Cards convert extracted obligations into accountable department tasks with owners,
            deadlines, evidence requirements, AI reasoning, validation checklists, and audit links.
          </p>
        </div>
        <button className="inline-flex h-11 items-center justify-center rounded-md border border-border-default bg-surface-elevated px-5 text-center text-sm font-semibold text-text-primary">
          Filter by severity
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {mapCards.map((card) => (
            <MAPCard key={card.id} card={card} />
          ))}
        </div>

        <aside className="space-y-6">
          <Panel>
            <PanelHeader title="Deadline Risk" eyebrow="Operational exposure" />
            <div className="space-y-3">
              {[
                ["Overdue", "1", "CERT-In incident reporting playbook"],
                ["Due in 7 days", "4", "Evidence pending or partial"],
                ["Human review", "9", "Closure blocked by approval"],
              ].map(([label, count, copy]) => (
                <div key={label} className="rounded-md border border-border-default bg-surface-strong p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">{label}</p>
                    <span className="text-2xl font-semibold text-accent-warning">{count}</span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Human Sign-off" eyebrow="Closure policy" />
            <div className="rounded-md border border-accent-cyan/25 bg-accent-cyan/10 p-4">
              <div className="mb-2 text-sm font-semibold text-accent-cyan">
                AI cannot close tasks alone
              </div>
              <p className="text-sm leading-6 text-text-secondary">
                ORBITAL can validate evidence and recommend closure, but final compliance closure must be approved by an authorized human reviewer.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
