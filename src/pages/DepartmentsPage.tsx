import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DepartmentPerformanceTable } from "../components/departments/DepartmentPerformanceTable";
import { MetricCard } from "../components/ui/MetricCard";
import { PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { departmentPerformance } from "../data/mockData";
import { fetchDepartmentTasks, type DepartmentTask } from "../services/pipelineApi";

const chartColors = {
  primary: "#412D15",
  critical: "#8F3B25",
  muted: "rgba(65,45,21,0.62)",
  tooltip: "#F8F3E2",
  tooltipText: "#1F150C",
  tooltipBorder: "rgba(65,45,21,0.18)",
};

/** Aggregate raw task rows into per-dept chart rows. */
function aggregateTasks(tasks: DepartmentTask[]) {
  const deptMap: Record<string, { assigned: number; closed: number; overdue: number; evidence: number }> = {};
  for (const task of tasks) {
    const dept = task.assigned_department ?? "Unknown";
    if (!deptMap[dept]) deptMap[dept] = { assigned: 0, closed: 0, overdue: 0, evidence: 0 };
    deptMap[dept].assigned += 1;
    if (task.task_status === "completed") deptMap[dept].closed += 1;
    if (task.task_status === "overdue") deptMap[dept].overdue += 1;
    if (!task.evidence_submitted) deptMap[dept].evidence += 1;
  }
  return Object.entries(deptMap).map(([department, v]) => ({
    department: department.slice(0, 16),
    assigned: v.assigned,
    closed: v.closed,
    overdue: v.overdue,
    closureRate: v.assigned ? Math.round((v.closed / v.assigned) * 100) : 0,
    evidenceRejectionRate: v.assigned ? Math.round((v.evidence / v.assigned) * 100) : 0,
    pendingEvidence: v.evidence,
  }));
}

export function DepartmentsPage() {
  const [liveTasks, setLiveTasks] = useState<DepartmentTask[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDepartmentTasks()
      .then((res) => setLiveTasks(res.tasks))
      .catch(() => setLiveTasks(null))
      .finally(() => setLoading(false));
  }, []);

  const isLive = liveTasks !== null && liveTasks.length > 0;
  const deptData = isLive ? aggregateTasks(liveTasks) : departmentPerformance;

  const totalAssigned = isLive ? liveTasks.length : 274;
  const totalClosed = isLive ? liveTasks.filter((t) => t.task_status === "completed").length : 216;
  const totalOverdue = isLive ? liveTasks.filter((t) => t.task_status === "overdue").length : 24;
  const closureRate = totalAssigned > 0 ? Math.round((totalClosed / totalAssigned) * 100) : 0;

  return (
    <PageContainer>
      <PageHeader eyebrow="Department Performance" title="Compliance operations performance">
        {isLive
          ? `Live data from ${liveTasks.length} active tasks across ${deptData.length} departments.`
          : "Compare department workload, evidence quality, high-risk exposure, closure rate, and overdue obligations."}
      </PageHeader>

      {loading && (
        <p className="text-sm text-text-muted">Loading live department tasks…</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned Obligations" value={String(totalAssigned)} change={isLive ? "Live backend data" : "+31 this month"} />
        <MetricCard label="Closed Obligations" value={String(totalClosed)} change={`${closureRate}% weighted closure`} tone="success" />
        <MetricCard label="Overdue" value={String(totalOverdue)} change={isLive ? "Requires attention" : "Cybersecurity and Ops lead"} tone="warning" />
        <MetricCard label="Avg Closure Time" value={isLive ? "Live run" : "8.3d"} change={isLive ? "Pipeline active" : "-1.4d vs last month"} tone="violet" />
      </div>

      <Panel>
        <PanelHeader title="Department Closure Rate" eyebrow={isLive ? "Live pipeline data" : "Executive view"} />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(65,45,21,0.10)" vertical={false} />
              <XAxis dataKey="department" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartColors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, color: chartColors.tooltipText }} />
              <Bar dataKey="closureRate" fill={chartColors.primary} radius={[4, 4, 0, 0]} name="Closure %" />
              <Bar dataKey="evidenceRejectionRate" fill={chartColors.critical} radius={[4, 4, 0, 0]} name="Evidence Pending %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {deptData.map((department) => (
          <Panel key={department.department} className="min-h-40">
            <p className="text-xs font-semibold uppercase text-text-muted">{department.department}</p>
            <p className="mt-3 text-3xl font-semibold text-text-primary">{department.closureRate}%</p>
            <div className="mt-4 h-2 rounded-full bg-bg-secondary">
              <div className="h-full rounded-full bg-accent-cyan" style={{ width: `${department.closureRate}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-text-secondary">
              {department.closed}/{department.assigned} closed · {department.overdue} overdue · {department.pendingEvidence} evidence pending
            </p>
          </Panel>
        ))}
      </div>

      <DepartmentPerformanceTable departments={deptData} />

      {/* Live task queue table */}
      {isLive && (
        <Panel>
          <PanelHeader title="Active Task Queue" eyebrow={`${liveTasks.filter((t) => t.task_status === "pending").length} pending tasks`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-left text-xs text-text-muted">
                  <th className="pb-3 pr-4 font-medium">Dept</th>
                  <th className="pb-3 pr-4 font-medium">Action</th>
                  <th className="pb-3 pr-4 font-medium">Severity</th>
                  <th className="pb-3 pr-4 font-medium">Domain</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {liveTasks.slice(0, 20).map((task) => (
                  <tr key={task.task_id} className="text-text-secondary">
                    <td className="py-3 pr-4 text-xs font-semibold text-text-primary">{task.assigned_department}</td>
                    <td className="py-3 pr-4 max-w-xs">
                      <p className="line-clamp-2 text-xs">{task.action}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        task.severity === "critical" ? "bg-red-500/20 text-red-400"
                        : task.severity === "high" ? "bg-orange-500/20 text-orange-400"
                        : task.severity === "medium" ? "bg-yellow-500/20 text-yellow-600"
                        : "bg-green-500/20 text-green-600"
                      }`}>
                        {task.severity}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs">{task.domain}</td>
                    <td className="py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        task.task_status === "completed" ? "bg-accent-success/20 text-accent-success" : "bg-accent-cyan/20 text-accent-cyan"
                      }`}>
                        {task.task_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {liveTasks.length > 20 && (
              <p className="mt-3 text-center text-xs text-text-muted">Showing 20 of {liveTasks.length} tasks</p>
            )}
          </div>
        </Panel>
      )}
    </PageContainer>
  );
}
