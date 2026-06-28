import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  circulars,
  departmentPerformance,
  regulatorDistribution,
  throughputTrend,
} from "../data/mockData";
import { MetricCard } from "../components/ui/MetricCard";
import { PageContainer } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { RegulatorBadge, RiskBadge, StatusPill } from "../components/ui/badges";
import { OrbitalIntelligenceGraph } from "../components/three/OrbitalIntelligenceGraph";
import { Leaderboard } from "../components/dashboard/Leaderboard";
import { usePipelineWorkflow } from "../state/PipelineWorkflowContext";

/** Derives dept bar chart rows from live MAP cards. */
function deriveDeptData(mapCards: Array<{ assignedDepartments?: string[]; owner?: string; status?: string }>) {
  const deptMap: Record<string, { assigned: number; closed: number; overdue: number }> = {};
  for (const card of mapCards) {
    const dept = (card.assignedDepartments?.[0] ?? card.owner ?? "Unknown").slice(0, 12);
    if (!deptMap[dept]) deptMap[dept] = { assigned: 0, closed: 0, overdue: 0 };
    deptMap[dept].assigned += 1;
    if (card.status === "Closed" || card.status === "Completed") deptMap[dept].closed += 1;
    if (card.status === "Overdue") deptMap[dept].overdue += 1;
  }
  return Object.entries(deptMap).map(([department, v]) => ({
    department,
    assigned: v.assigned,
    closed: v.closed,
    overdue: v.overdue,
    closureRate: v.assigned ? Math.round((v.closed / v.assigned) * 100) : 0,
    evidenceRejectionRate: 0,
    pendingEvidence: v.assigned - v.closed,
  }));
}

const chartColors = {
  primary: "#412D15",
  olive: "#596B35",
  bronze: "#8C6A3B",
  warning: "#A16822",
  critical: "#8F3B25",
  muted: "rgba(65,45,21,0.62)",
  tooltip: "#F8F3E2",
  tooltipText: "#1F150C",
  tooltipBorder: "rgba(65,45,21,0.18)",
};

export function CommandCenterPage() {
  const workflow = usePipelineWorkflow();
  const activeCirculars = workflow.metadata ? [workflow.metadata] : circulars;
  const activeCards = workflow.mapCards;
  const activeEvidence = workflow.evidenceItems;
  const totalObligations = activeCirculars.reduce((sum, circular) => sum + circular.totalObligations, 0);
  const highRisk = activeCirculars.reduce((sum, circular) => sum + circular.highRiskCount, 0);
  const overdue = activeCards.filter((card) => card.status === "Overdue").length;
  const pendingEvidence = activeEvidence.filter((item) => item.validationResult !== "Pass").length;
  const validationLabel = workflow.validationScore > 0 ? `${Math.round(workflow.validationScore * 100)}%` : "Awaiting run";

  // Use live derived data when a real pipeline run has completed, else fall back to mock
  const activeDeptData =
    workflow.dataset === "live" && workflow.mapCards.length > 0
      ? deriveDeptData(workflow.mapCards)
      : departmentPerformance;

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Panel className="overflow-hidden p-0">
          <div className="grid min-h-80 gap-0 2xl:grid-cols-[1fr_0.85fr]">
            <div className="p-6">
              <p className="mb-3 text-xs font-semibold uppercase text-accent-cyan">Supervisor Dashboard</p>
              <h2 className="text-3xl font-semibold leading-tight text-text-primary">
                Track every regulatory obligation from source clause to evidence closure.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
                ORBITAL identifies obligations, validates JSON, creates MAP cards, routes tasks to departments,
                validates evidence, and locks a complete audit chain for supervisory review.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["JSON valid", validationLabel],
                  ["Human review", `${workflow.validationIssues.length || pendingEvidence} items`],
                  ["Audit chain", `${workflow.auditEvents.length} events`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border-default bg-surface-strong p-3">
                    <p className="text-[10px] uppercase text-text-muted">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <OrbitalIntelligenceGraph compact className="min-h-80 rounded-none border-0 border-t border-border-default 2xl:border-l 2xl:border-t-0" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Urgent Attention" eyebrow="Next 7 days" />
          <div className="space-y-3">
            {activeCards.map((card) => (
              <div key={card.id} className="rounded-md border border-border-default bg-surface-strong p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <RegulatorBadge regulator={card.sourceRegulator} />
                  <RiskBadge severity={card.severity} />
                  <StatusPill status={card.status} />
                </div>
                <p className="text-sm font-semibold text-text-primary">{card.title}</p>
                <div className="mt-3 flex justify-between text-xs text-text-muted">
                  <span>{card.owner}</span>
                  <span>{card.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Circulars Processed" value={String(activeCirculars.length)} change={workflow.dataset === "live" ? "Current backend run" : "Demo seed data"} />
        <MetricCard label="Obligations Extracted" value={String(totalObligations)} change={`${validationLabel} schema confidence`} tone="violet" />
        <MetricCard label="High-Risk Open" value={String(highRisk)} change={`${overdue} overdue cards`} tone="warning" />
        <MetricCard label="Closure Rate" value={pendingEvidence ? "In review" : "Ready"} change={`${pendingEvidence} evidence items pending`} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Panel>
          <PanelHeader title="Obligation Throughput" eyebrow={workflow.dataset === "live" ? "Portfolio simulation" : "Extraction to closure"} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughputTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="validatedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="closedFill2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.olive} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={chartColors.olive} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(65,45,21,0.10)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: chartColors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartColors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, color: chartColors.tooltipText }} />
                <Area type="monotone" dataKey="validated" stroke={chartColors.primary} strokeWidth={2} fill="url(#validatedFill)" />
                <Area type="monotone" dataKey="closed" stroke={chartColors.olive} strokeWidth={2} fill="url(#closedFill2)" />
                <Area type="monotone" dataKey="highRisk" stroke={chartColors.warning} strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Regulator Distribution" eyebrow={workflow.dataset === "live" ? "Portfolio simulation" : "Workload source"} />
          <div className="grid gap-4 md:grid-cols-[1fr_0.8fr] xl:grid-cols-1 2xl:grid-cols-[1fr_0.8fr]">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={regulatorDistribution} dataKey="value" nameKey="regulator" innerRadius={62} outerRadius={88} paddingAngle={4}>
                    {regulatorDistribution.map((entry) => (
                      <Cell key={entry.regulator} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, color: chartColors.tooltipText }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {regulatorDistribution.map((entry) => (
                <div key={entry.regulator} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                    {entry.regulator}
                  </span>
                  <span className="font-semibold text-text-primary">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <Panel>
          <PanelHeader title="Department Workload" eyebrow={workflow.dataset === "live" ? "Live pipeline run" : "Closed, open, overdue"} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeDeptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(65,45,21,0.10)" vertical={false} />
                <XAxis dataKey="department" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartColors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: chartColors.tooltip, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, color: chartColors.tooltipText }} />
                <Bar dataKey="closed" stackId="a" fill={chartColors.olive} radius={[0, 0, 4, 4]} />
                <Bar dataKey="assigned" stackId="a" fill={chartColors.bronze} />
                <Bar dataKey="overdue" stackId="a" fill={chartColors.critical} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Validation Queue" eyebrow="Evidence review" />
          <div className="space-y-3">
            {activeEvidence.map((item) => (
              <div key={item.id} className="rounded-md border border-border-default bg-surface-strong p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-text-muted">{item.id}</span>
                  <StatusPill status={item.validationResult} />
                </div>
                <p className="text-sm font-semibold text-text-primary">{item.fileName}</p>
                <p className="mt-2 text-xs text-text-muted">{item.recommendation}</p>
              </div>
            ))}
            <div className="rounded-md border border-accent-cyan/25 bg-accent-cyan/10 p-4">
              <div className="text-sm font-semibold text-accent-cyan">
                Human sign-off remains mandatory
              </div>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                AI can recommend closure, rejection, or escalation. Compliance officers make the final decision.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Leaderboard />
    </PageContainer>
  );
}
