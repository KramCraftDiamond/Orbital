import { NavLink } from "react-router";
import {
  Binary,
  Building2,
  ClipboardList,
  FileJson2,
  FileUp,
  Gauge,
  History,
  Settings,
  ShieldCheck,
  SplitSquareHorizontal,
} from "lucide-react";
import { cn } from "../../lib/ui";

const navItems = [
  { path: "/app", label: "Command Center", sublabel: "Compliance cockpit", icon: Gauge, end: true },
  { path: "/app/upload", label: "Upload Circular", sublabel: "OCR and parsing", icon: FileUp },
  { path: "/app/obligations", label: "Obligation Review", sublabel: "Validated JSON", icon: FileJson2 },
  { path: "/app/maps", label: "MAP Cards", sublabel: "Department tasks", icon: ClipboardList },
  { path: "/app/evidence", label: "Evidence Portal", sublabel: "AI validation", icon: ShieldCheck },
  { path: "/app/audit", label: "Audit Trail", sublabel: "Immutable ledger", icon: History },
  { path: "/app/departments", label: "Departments", sublabel: "Performance", icon: Building2 },
  { path: "/app/comparator", label: "Policy Comparator", sublabel: "RAG gap analysis", icon: SplitSquareHorizontal },
  { path: "/app/settings", label: "Settings", sublabel: "Model controls", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-[#E1DCC9]/12 bg-[#1F150C] text-[#E1DCC9] shadow-[18px_0_50px_rgba(65,45,21,0.14)] lg:flex lg:flex-col">
      <div className="border-b border-[#E1DCC9]/12 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E1DCC9]/24 bg-[#E1DCC9]/10 text-[#E1DCC9]">
            <Binary className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-sm font-bold uppercase text-[#E1DCC9]">ORBITAL</p>
            <p className="mt-0.5 text-[10px] uppercase text-[#E1DCC9]/52">Banking Risk Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 transition-colors",
                  isActive
                    ? "border-[#E1DCC9]/24 bg-[#E1DCC9]/12 text-[#E1DCC9]"
                    : "text-[#E1DCC9]/68 hover:border-[#E1DCC9]/12 hover:bg-[#E1DCC9]/7",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#E1DCC9]" : "text-[#E1DCC9]/42")} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className="block truncate text-[10px] text-[#E1DCC9]/42">{item.sublabel}</span>
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[#E1DCC9]/12 p-5">
        <div className="rounded-lg border border-[#E1DCC9]/12 bg-[#000000]/18 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-success" />
            <span className="text-xs font-semibold text-[#E1DCC9]">Private model online</span>
          </div>
          <p className="text-xs leading-5 text-[#E1DCC9]/52">
            QLoRA extraction pipeline, JSON validator, and policy comparator running in on-prem mode.
          </p>
        </div>
      </div>
    </aside>
  );
}
