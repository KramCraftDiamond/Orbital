import { type ReactNode, useRef } from "react";
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
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useDashboardIntro } from "../../animations/useDashboardIntro";

const metrics = [
  {
    label: "Circulars Processed",
    value: "146",
    change: "+18 this week",
    tone: "cyan",
    icon: FileText,
  },
  {
    label: "Obligations Extracted",
    value: "1,284",
    change: "94% schema-valid",
    tone: "violet",
    icon: ShieldCheck,
  },
  {
    label: "High-Risk Open",
    value: "37",
    change: "8 due in 7 days",
    tone: "warning",
    icon: AlertTriangle,
  },
  {
    label: "Closure Rate",
    value: "87%",
    change: "+6.2% vs last month",
    tone: "success",
    icon: CheckCircle2,
  },
];

const riskTrend = [
  { day: "Mon", extracted: 72, closed: 46, highRisk: 12 },
  { day: "Tue", extracted: 88, closed: 58, highRisk: 17 },
  { day: "Wed", extracted: 104, closed: 69, highRisk: 21 },
  { day: "Thu", extracted: 96, closed: 74, highRisk: 18 },
  { day: "Fri", extracted: 132, closed: 93, highRisk: 25 },
  { day: "Sat", extracted: 78, closed: 62, highRisk: 13 },
  { day: "Sun", extracted: 116, closed: 84, highRisk: 19 },
];

const regulatorMix = [
  { name: "RBI", value: 42, color: "#E1DCC9" },
  { name: "SEBI", value: 18, color: "#9C7743" },
  { name: "NPCI", value: 15, color: "#C8B97A" },
  { name: "CERT-In", value: 13, color: "#B98236" },
  { name: "Other", value: 12, color: "#8A7F6C" },
];

const departmentLoad = [
  { dept: "KYC", open: 42, overdue: 8, closed: 64 },
  { dept: "AML", open: 35, overdue: 6, closed: 58 },
  { dept: "InfoSec", open: 29, overdue: 4, closed: 73 },
  { dept: "Risk", open: 31, overdue: 9, closed: 49 },
  { dept: "Ops", open: 27, overdue: 5, closed: 52 },
];

const pipeline = [
  { label: "Ingested", value: 146, pct: 100 },
  { label: "Parsed", value: 139, pct: 95 },
  { label: "JSON Valid", value: 131, pct: 90 },
  { label: "MAP Cards", value: 118, pct: 81 },
  { label: "Evidence", value: 86, pct: 59 },
  { label: "Signed Off", value: 71, pct: 49 },
];

const priorityQueue = [
  {
    title: "RBI KYC Amendment 2026",
    owner: "KYC Operations",
    due: "2026-05-25",
    risk: "Critical",
  },
  {
    title: "CERT-In Incident Reporting Controls",
    owner: "Information Security",
    due: "2026-05-28",
    risk: "High",
  },
  {
    title: "NPCI UPI Reconciliation Evidence",
    owner: "Payments Ops",
    due: "2026-05-30",
    risk: "High",
  },
];

const validationStates = [
  { label: "Pass", value: 89, color: "bg-accent-success" },
  { label: "Partial", value: 23, color: "bg-accent-warning" },
  { label: "Rejected", value: 12, color: "bg-accent-critical" },
  { label: "Review", value: 32, color: "bg-accent-cyan" },
];

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-gsap-target="dashboard-panel"
      className={`rounded-lg border border-border-default bg-surface-base p-5 shadow-[0_18px_60px_rgba(0,0,0,0.26)] backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}

function PanelTitle({
  title,
  kicker,
}: {
  title: string;
  kicker?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {kicker && (
          <p className="mb-1 text-[10px] font-semibold uppercase text-text-muted">
            {kicker}
          </p>
        )}
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      </div>
    </div>
  );
}

function getToneClasses(tone: string) {
  if (tone === "success") return "text-accent-success bg-accent-success/10";
  if (tone === "warning") return "text-accent-warning bg-accent-warning/10";
  if (tone === "violet") return "text-accent-violet bg-accent-violet/10";
  return "text-accent-cyan bg-accent-cyan/10";
}

export function Dashboard() {
  const rootRef = useRef<HTMLElement>(null);

  useDashboardIntro(rootRef);

  return (
    <section
      ref={rootRef}
      data-gsap-target="page-root"
      className="min-h-full bg-background px-6 py-6 text-text-primary lg:px-8"
    >
      <div data-gsap-target="page-header" className="mb-6">
        <div className="flex flex-col gap-4 border-b border-border-strong pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-accent-cyan">
              ORBITAL Command Center
            </p>
            <h1
              data-gsap-target="page-title"
              className="max-w-4xl text-4xl font-semibold text-text-primary"
            >
              Regulatory execution cockpit for circulars, MAP cards, evidence,
              and audit closure.
            </h1>
          </div>

          <div
            data-gsap-target="date-chip"
            className="flex min-w-64 items-center justify-between gap-4 rounded-lg border border-border-default bg-surface-elevated px-4 py-3"
          >
            <div>
              <p className="text-[10px] uppercase text-text-muted">Demo date</p>
              <p className="text-sm font-semibold text-text-primary">2026-05-22</p>
            </div>
            <div className="rounded-md bg-accent-cyan/10 p-2 text-accent-cyan">
              <Clock3 className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <div
        data-gsap-target="dashboard-grid"
        className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Panel key={metric.label} className="min-h-36">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-text-secondary">{metric.label}</p>
                  <p className="mt-3 text-4xl font-semibold text-text-primary">
                    {metric.value}
                  </p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-text-muted">
                    <ArrowUpRight className="h-3.5 w-3.5 text-accent-success" />
                    {metric.change}
                  </p>
                </div>
                <span className={`rounded-md p-2 ${getToneClasses(metric.tone)}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Panel className="min-h-[360px]">
          <PanelTitle
            title="Obligation Throughput"
            kicker="Extraction to closure"
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="extractedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E1DCC9" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#E1DCC9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="closedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8B97A" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#C8B97A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#8A7F6C", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8A7F6C", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1F150C",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: "8px",
                    color: "#E1DCC9",
                  }}
                />
                <Area type="monotone" dataKey="extracted" stroke="#E1DCC9" strokeWidth={2} fill="url(#extractedFill)" />
                <Area type="monotone" dataKey="closed" stroke="#C8B97A" strokeWidth={2} fill="url(#closedFill)" />
                <Area type="monotone" dataKey="highRisk" stroke="#B98236" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 text-xs text-text-secondary sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-cyan" /> Extracted
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-success" /> Closed
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-warning" /> High risk
            </span>
          </div>
        </Panel>

        <Panel className="min-h-[360px]">
          <PanelTitle title="Regulator Mix" kicker="Circular source" />
          <div className="grid gap-4 md:grid-cols-[1fr_0.9fr] xl:grid-cols-1 2xl:grid-cols-[1fr_0.9fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regulatorMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={4}
                  >
                    {regulatorMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1F150C",
                      border: "1px solid rgba(148, 163, 184, 0.22)",
                      borderRadius: "8px",
                      color: "#E1DCC9",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {regulatorMix.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold text-text-primary">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelTitle title="Closed-Loop Workflow" kicker="Regulation to audit trail" />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {pipeline.map((step, index) => (
              <div
                key={step.label}
                className="rounded-md border border-border-default bg-surface-strong p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] uppercase text-text-muted">
                    Step {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-accent-cyan">
                    {step.pct}%
                  </span>
                </div>
                <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{step.value}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-bg-secondary">
                  <div
                    className="h-full rounded-full bg-accent-cyan"
                    style={{ width: `${step.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Department Workload" kicker="Open tasks and overdue MAPs" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentLoad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                <XAxis dataKey="dept" tick={{ fill: "#8A7F6C", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8A7F6C", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1F150C",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: "8px",
                    color: "#E1DCC9",
                  }}
                />
                <Bar dataKey="closed" stackId="a" fill="#C8B97A" radius={[0, 0, 4, 4]} />
                <Bar dataKey="open" stackId="a" fill="#9C7743" />
                <Bar dataKey="overdue" stackId="a" fill="#A25236" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel>
            <PanelTitle title="Evidence Validation" kicker="AI verdict states" />
            <div className="space-y-4">
              {validationStates.map((state) => (
                <div key={state.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{state.label}</span>
                    <span className="font-semibold text-text-primary">{state.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
                    <div
                      className={`h-full rounded-full ${state.color}`}
                      style={{ width: `${Math.min(state.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Priority Queue" kicker="Needs action" />
            <div className="space-y-3">
              {priorityQueue.map((item) => (
                <div
                  key={item.title}
                  className="rounded-md border border-border-default bg-surface-strong p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                    <span className="rounded bg-accent-critical/10 px-2 py-1 text-[10px] font-semibold uppercase text-accent-critical">
                      {item.risk}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{item.owner}</span>
                    <span>{item.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
