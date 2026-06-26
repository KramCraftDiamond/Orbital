import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,237,0.72),rgba(225,220,201,0.94)),linear-gradient(rgba(65,45,21,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(65,45,21,0.025)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px]" />
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
