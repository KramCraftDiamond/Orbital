import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DepartmentPerformanceTable } from "../components/departments/DepartmentPerformanceTable";
import { MetricCard } from "../components/ui/MetricCard";
import { PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { departmentPerformance } from "../data/mockData";

const chartColors = {
  primary: "#412D15",
  critical: "#8F3B25",
  muted: "rgba(65,45,21,0.62)",
  tooltip: "#F8F3E2",
  tooltipText: "#1F150C",
  tooltipBorder: "rgba(65,45,21,0.18)",
};

export function DepartmentsPage() {
  return (
    <PageContainer>
      <PageHeader eyebrow="Department Performance" title="Compliance operations performance">
        Compare department workload, evidence quality, high-risk exposure, closure rate, and overdue obligations.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned Obligations" value="274" change="+31 this month" />
        <MetricCard label="Closed Obligations" value="216" change="79% weighted closure" tone="success" />
        <MetricCard label="Overdue" value="24" change="Cybersecurity and Ops lead" tone="warning" />
        <MetricCard label="Avg Closure Time" value="8.3d" change="-1.4d vs last month" tone="violet" />
      </div>

      <Panel>
        <PanelHeader title="Department Closure Rate" eyebrow="Executive view" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        {departmentPerformance.map((department) => (
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

      <DepartmentPerformanceTable departments={departmentPerformance} />
    </PageContainer>
  );
}
