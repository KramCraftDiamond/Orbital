import type { DepartmentPerformance } from "../../types/orbital";
import { percent } from "../../lib/ui";

export function DepartmentPerformanceTable({
  departments,
}: {
  departments: DepartmentPerformance[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-surface-base">
      <div className="grid grid-cols-[1.4fr_repeat(7,0.8fr)] gap-4 border-b border-border-default bg-surface-strong px-4 py-3 text-xs font-semibold uppercase text-text-muted">
        <span>Department</span>
        <span>Assigned</span>
        <span>Closed</span>
        <span>Overdue</span>
        <span>Evidence</span>
        <span>Avg close</span>
        <span>Exposure</span>
        <span>Closure</span>
      </div>
      {departments.map((department) => (
        <div
          key={department.department}
          className="grid grid-cols-[1.4fr_repeat(7,0.8fr)] gap-4 border-b border-border-default px-4 py-4 text-sm last:border-b-0"
        >
          <div>
            <p className="font-semibold text-text-primary">{department.department}</p>
            <p className="mt-1 text-xs text-text-muted">
              Rejection rate {percent(department.evidenceRejectionRate)}
            </p>
          </div>
          <span className="text-text-secondary">{department.assigned}</span>
          <span className="text-text-secondary">{department.closed}</span>
          <span className={department.overdue > 5 ? "font-semibold text-accent-critical" : "text-text-secondary"}>
            {department.overdue}
          </span>
          <span className="text-text-secondary">{department.pendingEvidence}</span>
          <span className="text-text-secondary">{department.averageClosureTime}</span>
          <span className="font-semibold text-text-primary">{department.highRiskExposure}</span>
          <div>
            <p className="mb-2 font-semibold text-text-primary">{percent(department.closureRate)}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-secondary">
              <div className="h-full rounded-full bg-accent-cyan" style={{ width: `${department.closureRate}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
