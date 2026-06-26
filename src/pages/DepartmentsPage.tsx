import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Clock3, FileWarning } from "lucide-react";
import { DepartmentPerformanceTable } from "../components/departments/DepartmentPerformanceTable";
import { MetricCard } from "../components/ui/MetricCard";
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
    <div className="space-y-6 p-5 xl:p-8">
      <div>
        <p className="text-xs font-semibold uppercase text-accent-cyan">Department Performance</p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">Compliance operations performance</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          Compare department workload, evidence quality, high-risk exposure, closure rate, and overdue obligations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned Obligations" value="274" change="+31 this month" icon={FileWarning} />
        <MetricCard label="Closed Obligations" value="216" change="79% weighted closure" icon={CheckCircle2} tone="success" />
        <MetricCard label="Overdue" value="24" change="Cybersecurity and Ops lead" icon={AlertTriangle} tone="warning" />
        <MetricCard label="Avg Closure Time" value="8.3d" change="-1.4d vs last month" icon={Clock3} tone="violet" />
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

      <DepartmentPerformanceTable departments={departmentPerformance} />
    </div>
  );
}
