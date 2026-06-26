import { NavLink } from "react-router";
import { cn } from "../../lib/ui";

const navItems = [
  { path: "/app", label: "Command Center", sublabel: "Compliance cockpit", end: true },
  { path: "/app/upload", label: "Upload Circular", sublabel: "OCR and parsing" },
  { path: "/app/obligations", label: "Obligation Review", sublabel: "Validated JSON" },
  { path: "/app/maps", label: "MAP Cards", sublabel: "Department tasks" },
  { path: "/app/evidence", label: "Evidence Portal", sublabel: "AI validation" },
  { path: "/app/audit", label: "Audit Trail", sublabel: "Immutable ledger" },
  { path: "/app/departments", label: "Departments", sublabel: "Performance" },
  { path: "/app/comparator", label: "Policy Comparator", sublabel: "RAG gap analysis" },
  { path: "/app/settings", label: "Settings", sublabel: "Model controls" },
];

export function Sidebar() {
  return (
    <aside className="relative z-10 hidden h-screen w-72 shrink-0 border-r border-border-strong bg-[#F8F3E2]/92 text-text-primary shadow-[18px_0_50px_rgba(65,45,21,0.10)] backdrop-blur-xl lg:flex lg:flex-col">
      <div className="shrink-0 border-b border-border-default px-5 py-6">
        <div className="text-center">
          <p className="font-display text-base font-bold uppercase tracking-[0.12em] text-text-primary">ORBITAL</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-text-muted">Banking Risk Intelligence</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {navItems.map((item) => {
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group flex min-h-16 items-center justify-center rounded-lg border px-4 py-3 text-center transition-colors",
                  isActive
                    ? "border-border-active bg-[#412D15] text-[#E1DCC9] shadow-[0_14px_32px_rgba(65,45,21,0.18)]"
                    : "border-transparent text-text-secondary hover:border-border-default hover:bg-surface-elevated",
                )
              }
            >
              {({ isActive }) => (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className={cn("mt-1 block truncate text-[10px]", isActive ? "text-[#E1DCC9]/62" : "text-text-muted")}>
                    {item.sublabel}
                  </span>
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border-default p-5">
        <div className="rounded-lg border border-border-default bg-surface-elevated p-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-success" />
            <span className="text-xs font-semibold text-text-primary">Private model online</span>
          </div>
          <p className="text-xs leading-5 text-text-muted">
            QLoRA extraction pipeline, JSON validator, and policy comparator running in on-prem mode.
          </p>
        </div>
      </div>
    </aside>
  );
}
