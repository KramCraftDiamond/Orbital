import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,237,0.72),rgba(225,220,201,0.94)),linear-gradient(rgba(65,45,21,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(65,45,21,0.025)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px]" />
      </div>
      <Sidebar />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <button
          className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-[#F8F3E2]/92 text-text-primary shadow-lg backdrop-blur lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 h-full w-full bg-black/45"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation overlay"
            type="button"
          />
          <div className="relative h-full w-72">
            <button
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-default bg-surface-elevated text-text-primary"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
