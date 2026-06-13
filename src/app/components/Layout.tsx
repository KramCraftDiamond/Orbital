import { Outlet, Link, useLocation } from "react-router";

export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: "■" },
    { path: "/tasks", label: "Task Feed", icon: "■" },
    { path: "/leaderboard", label: "Leaderboard", icon: "■" },
    { path: "/evidence", label: "Evidence Portal", icon: "■" },
    { path: "/audit", label: "Audit Trail", icon: "■" },
  ];

  return (
    <div
      data-gsap-target="app-shell"
      className="flex h-screen bg-white"
    >
      <aside className="w-64 border-r-2 border-black p-6">
        <div className="mb-12 border-2 border-black p-4">
          <div className="text-2xl font-bold mb-2">ORBITAL</div>
          <div className="text-xs leading-tight">
            Operational Regulatory & Banking Intelligence Tracking AI Layer
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block p-3 border-2 border-black ${
                location.pathname === item.path ? "bg-black text-white" : "bg-white"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
