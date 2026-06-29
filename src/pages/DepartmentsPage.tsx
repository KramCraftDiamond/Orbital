import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DepartmentPerformanceTable } from "../components/departments/DepartmentPerformanceTable";
import { RiskBadge, StatusPill } from "../components/ui/badges";
import { MetricCard } from "../components/ui/MetricCard";
import { PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { departmentPerformance } from "../data/mockData";
import { type DepartmentTask, fetchDepartmentTasks } from "../services/pipelineApi";
import type { DepartmentPerformance, Severity } from "../types/orbital";

const chartColors = {
  primary: "#412D15",
  critical: "#8F3B25",
  muted: "rgba(65,45,21,0.62)",
  tooltip: "#F8F3E2",
  tooltipText: "#1F150C",
  tooltipBorder: "rgba(65,45,21,0.18)",
};

export function DepartmentsPage() {
  const [tasks, setTasks] = useState<DepartmentTask[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchDepartmentTasks()
      .then((response) => {
        if (alive) {
          setTasks(response.tasks);
          setError("");
        }
      })
      .catch((caught) => {
        if (alive) {
          setError(caught instanceof Error ? caught.message : "Unable to load live task data.");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const liveDepartments = useMemo(() => aggregateTasks(tasks), [tasks]);
  const departments = liveDepartments.length ? liveDepartments : departmentPerformance;
  const assigned = departments.reduce((sum, item) => sum + item.assigned, 0);
  const closed = departments.reduce((sum, item) => sum + item.closed, 0);
  const overdue = departments.reduce((sum, item) => sum + item.overdue, 0);
  const pendingEvidence = departments.reduce((sum, item) => sum + item.pendingEvidence, 0);
  const liveMode = liveDepartments.length > 0;

  return (
    <PageContainer>
      <PageHeader eyebrow="Department Performance" title="Compliance operations performance">
        Compare department workload, evidence quality, high-risk exposure, closure rate, and overdue obligations.
      </PageHeader>

      {error && (
        <Panel>
          <div className="rounded-md border border-accent-warning/25 bg-accent-warning/10 p-4 text-sm text-text-secondary">
            {error}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned Obligations" value={String(assigned)} change={liveMode ? "Live task table" : "Demo seed data"} />
        <MetricCard label="Closed Obligations" value={String(closed)} change={`${percent(closed, assigned)}% closure`} tone="success" />
        <MetricCard label="Overdue" value={String(overdue)} change={`${pendingEvidence} evidence pending`} tone="warning" />
        <MetricCard label="Departments Active" value={String(departments.length)} change={liveMode ? "From SQLite tasks" : "Portfolio simulation"} tone="violet" />
      </div>

      <Panel>
        <PanelHeader title="Department Closure Rate" eyebrow={liveMode ? "Live task data" : "Executive view"} />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(65,45,21,0.10)" vertical={false} />
              <XAxis dataKey="department" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartColors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, color: chartColors.tooltipText }} />
              <Bar dataKey="closureRate" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="evidenceRejectionRate" fill={chartColors.critical} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {departments.map((department) => (
          <Panel key={department.department} className="min-h-40">
            <p className="text-xs font-semibold uppercase text-text-muted">{department.department}</p>
            <p className="mt-3 text-3xl font-semibold text-text-primary">{department.closureRate}%</p>
            <div className="mt-4 h-2 rounded-full bg-bg-secondary">
              <div className="h-full rounded-full bg-accent-cyan" style={{ width: `${department.closureRate}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-text-secondary">
              {department.closed}/{department.assigned} closed, {department.overdue} overdue, {department.pendingEvidence} evidence pending
            </p>
          </Panel>
        ))}
      </div>

      {tasks.length > 0 && (
        <Panel>
          <PanelHeader title="Live Task Queue" eyebrow="Top 20 active tasks" />
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2">Task</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 20).map((task) => (
                  <tr key={task.taskId} className="bg-surface-strong">
                    <td className="rounded-l-md px-3 py-3 font-semibold text-text-primary">{task.action}</td>
                    <td className="px-3 py-3 text-text-secondary">{task.assignedDepartment}</td>
                    <td className="px-3 py-3">
                      <RiskBadge severity={normalizeSeverity(task.severity)} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={task.taskStatus} />
                    </td>
                    <td className="rounded-r-md px-3 py-3 text-text-secondary">
                      {task.evidenceSubmitted || "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <DepartmentPerformanceTable departments={departments} />
    </PageContainer>
  );
}

function aggregateTasks(tasks: DepartmentTask[]): DepartmentPerformance[] {
  const grouped = new Map<string, DepartmentTask[]>();
  for (const task of tasks) {
    const key = task.assignedDepartment || "Compliance";
    grouped.set(key, [...(grouped.get(key) || []), task]);
  }

  return Array.from(grouped.entries()).map(([department, items]) => {
    const assigned = items.length;
    const closed = items.filter((task) => task.taskStatus === "completed").length;
    const highRisk = items.filter((task) => ["high", "critical"].includes(String(task.severity).toLowerCase())).length;
    const pendingEvidence = items.filter((task) => !task.evidenceSubmitted && task.taskStatus !== "completed").length;
    return {
      department,
      assigned,
      closed,
      overdue: 0,
      pendingEvidence,
      averageClosureTime: "Live",
      highRiskExposure: `${highRisk} high-risk`,
      evidenceRejectionRate: pendingEvidence ? Math.round((pendingEvidence / assigned) * 100) : 0,
      closureRate: percent(closed, assigned),
    };
  });
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function normalizeSeverity(value: string): Severity {
  const severity = String(value).toLowerCase();
  if (severity === "critical" || severity === "high" || severity === "medium" || severity === "low") {
    return severity as Severity;
  }
  return "medium";
}
