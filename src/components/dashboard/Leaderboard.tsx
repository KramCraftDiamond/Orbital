import { useState } from "react";
import { departmentPerformance } from "../../data/mockData";
import { cn } from "../../lib/ui";
import { Panel, PanelHeader } from "../ui/panel";

const periods = ["This Week", "This Month", "Quarter"] as const;

export function Leaderboard() {
  const [activePeriod, setActivePeriod] = useState<(typeof periods)[number]>("This Month");
  const rankedDepartments = [...departmentPerformance].sort((a, b) => b.closureRate - a.closureRate);

  return (
    <Panel>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PanelHeader title="Department Leaderboard" eyebrow="Supervisor view" />
        <div className="flex rounded-md border border-border-default bg-bg-secondary p-1">
          {periods.map((period) => (
            <button
              key={period}
              className={cn(
                "h-9 rounded px-3 text-xs font-semibold transition-colors",
                activePeriod === period
                  ? "bg-[#412D15] text-[#E1DCC9]"
                  : "text-text-secondary hover:bg-surface-elevated",
              )}
              onClick={() => setActivePeriod(period)}
              type="button"
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {rankedDepartments.slice(0, 3).map((department, index) => (
          <div key={department.department} className="rounded-md border border-border-default bg-surface-strong p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Rank {index + 1}</p>
                <h3 className="mt-2 text-base font-semibold text-text-primary">{department.department}</h3>
              </div>
              <span className="text-2xl font-semibold text-accent-cyan">{department.closureRate}</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-bg-secondary">
              <div
                className="h-full rounded-full bg-accent-cyan"
                style={{ width: `${department.closureRate}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-text-muted">
              {department.closed}/{department.assigned} closed · {department.overdue} overdue
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-border-default">
        <div className="grid grid-cols-[52px_1fr_90px_90px] bg-bg-secondary px-4 py-3 text-xs font-semibold uppercase text-text-muted">
          <span>Rank</span>
          <span>Department</span>
          <span>Closure</span>
          <span>Evidence</span>
        </div>
        {rankedDepartments.map((department, index) => (
          <div
            key={department.department}
            className="grid grid-cols-[52px_1fr_90px_90px] border-t border-border-default px-4 py-3 text-sm"
          >
            <span className="font-semibold text-text-primary">{index + 1}</span>
            <span className="text-text-secondary">{department.department}</span>
            <span className="font-semibold text-text-primary">{department.closureRate}%</span>
            <span className="text-text-secondary">{department.pendingEvidence}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
