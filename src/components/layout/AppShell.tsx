import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-accent-cyan/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent-violet/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(225,220,201,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(225,220,201,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
