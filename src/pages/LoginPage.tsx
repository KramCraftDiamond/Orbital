import { Link } from "react-router";
import { ArrowRight, LockKeyhole, Server, ShieldCheck } from "lucide-react";
import { OrbitalIntelligenceGraph } from "../components/three/OrbitalIntelligenceGraph";

export function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(167,139,250,0.12),transparent_32%)]" />
      <div className="relative z-10 grid min-h-screen gap-8 px-6 py-8 lg:grid-cols-[1fr_440px] lg:px-10">
        <section className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-text-primary">ORBITAL</p>
                <p className="text-xs text-text-muted">Operational Regulatory & Banking Intelligence Tracking AI Layer</p>
              </div>
            </div>

            <div className="mt-16 max-w-3xl">
              <p className="mb-4 text-xs font-semibold uppercase text-accent-cyan">
                Enterprise regulatory intelligence
              </p>
              <h1 className="text-5xl font-semibold leading-tight text-text-primary xl:text-6xl">
                Regulation to action. Action to proof.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-text-secondary">
                ORBITAL converts Indian banking circulars into structured obligations, MAP cards,
                evidence workflows, AI validation, human sign-off, and immutable audit trails.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Closed-loop workflow", "Circulars are tracked from source clause to final audit closure."],
              ["On-prem deployment", "Designed for private bank infrastructure and sensitive compliance data."],
              ["Human in the loop", "AI validates evidence, but closure requires authorized sign-off."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-border-default bg-surface-base p-4">
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="mt-2 text-xs leading-5 text-text-muted">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full space-y-5">
            <OrbitalIntelligenceGraph compact className="min-h-80" />

            <div className="rounded-lg border border-border-default bg-surface-base p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase text-text-muted">Secure enterprise access</p>
                <h2 className="mt-2 text-2xl font-semibold text-text-primary">Initialize ORBITAL session</h2>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-text-secondary">Bank email</span>
                  <input
                    className="h-11 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary"
                    defaultValue="compliance.officer@bank.internal"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-text-secondary">Access profile</span>
                  <select className="h-11 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary">
                    <option>Compliance command center</option>
                    <option>Department owner</option>
                    <option>Internal audit reviewer</option>
                  </select>
                </label>

                <div className="rounded-md border border-border-default bg-surface-strong p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Server className="h-4 w-4 text-accent-success" />
                    Private inference stack ready
                  </div>
                  <p className="mt-2 text-xs leading-5 text-text-muted">
                    OCR, obligation extraction, JSON validation, RAG comparator, and audit ledger services are available.
                  </p>
                </div>

                <Link
                  to="/app"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent-cyan text-sm font-semibold text-background"
                >
                  Enter command center
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-text-muted">
                <LockKeyhole className="h-3.5 w-3.5 text-accent-success" />
                No bank data leaves the private environment.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
