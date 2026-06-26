import { Link } from "react-router";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  RadioTower,
  Server,
  ShieldCheck,
} from "lucide-react";
import { WarmCyberGridShader } from "../components/landing/WarmCyberGridShader";
import { WarmGlobeSatellites } from "../components/landing/WarmGlobeSatellites";

const palette = {
  black: "#000000",
  espresso: "#1F150C",
  bronze: "#412D15",
  parchment: "#E1DCC9",
};

export function LoginPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden text-[#E1DCC9]"
      style={{ background: palette.black }}
    >
      <WarmCyberGridShader />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_23%_22%,rgba(225,220,201,0.16),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(65,45,21,0.45),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.25),#000000_86%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 grid min-h-screen gap-8 px-5 py-6 lg:grid-cols-[1.08fr_440px] lg:px-10 xl:gap-12">
        <section className="flex min-h-[620px] flex-col justify-between">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E1DCC9]/20 bg-[#1F150C]/60 text-[#E1DCC9] shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#E1DCC9]">ORBITAL</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#E1DCC9]/55">
                  Regulatory intelligence layer
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-[#E1DCC9]/15 bg-black/35 px-3 py-2 text-xs text-[#E1DCC9]/70 backdrop-blur md:flex">
              <span className="h-2 w-2 rounded-full bg-[#E1DCC9] shadow-[0_0_18px_rgba(225,220,201,0.65)]" />
              Private bank environment
            </div>
          </div>

          <div className="grid flex-1 items-center gap-8 py-10 xl:grid-cols-[0.92fr_1fr]">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E1DCC9]/15 bg-[#1F150C]/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E1DCC9]/70 backdrop-blur">
                <RadioTower className="h-3.5 w-3.5" />
                Secure layer initializing
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-[#E1DCC9] xl:text-7xl">
                Regulation to action. Action to proof.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#E1DCC9]/68">
                ORBITAL turns regulatory circulars into structured obligations, MAP cards,
                evidence validation, human sign-off, and an immutable audit trail.
              </p>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  ["OCR", "Parsing online"],
                  ["JSON", "Schema locked"],
                  ["Audit", "Chain verified"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#E1DCC9]/12 bg-[#1F150C]/35 p-4 backdrop-blur"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#E1DCC9]/45">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#E1DCC9]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto hidden w-full max-w-[520px] xl:block">
              <div className="absolute inset-10 rounded-full bg-[#E1DCC9]/10 blur-3xl" />
              <WarmGlobeSatellites />
            </div>
          </div>

          <div className="grid gap-3 pb-2 md:grid-cols-3">
            {[
              ["Closed-loop workflow", "Source clause to final closure."],
              ["Human sign-off", "AI validates, officers approve."],
              ["On-prem posture", "Bank data remains private."],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="rounded-xl border border-[#E1DCC9]/12 bg-black/25 p-4 backdrop-blur"
              >
                <p className="text-sm font-semibold text-[#E1DCC9]">{title}</p>
                <p className="mt-2 text-xs leading-5 text-[#E1DCC9]/52">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full">
            <div
              className="relative overflow-hidden rounded-[28px] border p-6 shadow-[0_34px_120px_rgba(0,0,0,0.72)] backdrop-blur-2xl"
              style={{
                borderColor: "rgba(225, 220, 201, 0.18)",
                background:
                  "linear-gradient(145deg, rgba(31,21,12,0.62), rgba(0,0,0,0.44) 52%, rgba(65,45,21,0.52))",
                boxShadow:
                  "0 34px 120px rgba(0,0,0,0.72), inset 0 1px 0 rgba(225,220,201,0.18), inset 0 -1px 0 rgba(225,220,201,0.07)",
              }}
            >
              <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-[#E1DCC9]/12 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#E1DCC9]/50 to-transparent" />

              <div className="relative">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E1DCC9]/52">
                      Employee access
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-[#E1DCC9]">
                      Enter ORBITAL
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#E1DCC9]/60">
                      Sign in to the regulatory command center.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E1DCC9]/14 bg-black/30 p-3 text-[#E1DCC9]/80">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-[#E1DCC9]/12 bg-black/28 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#E1DCC9]">
                    <Server className="h-4 w-4 text-[#E1DCC9]/76" />
                    Secure boot sequence
                  </div>
                  <div className="space-y-3">
                    {[
                      ["Private model endpoint", "Ready"],
                      ["JSON validator", "Armed"],
                      ["Audit ledger", "Locked"],
                    ].map(([label, state]) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-[11px] text-[#E1DCC9]/58">
                          <span>{label}</span>
                          <span>{state}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-black/45">
                          <div className="h-full rounded-full bg-[#E1DCC9]/80" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-[#E1DCC9]/62">
                      Employee ID
                    </span>
                    <div className="relative">
                      <Fingerprint className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#E1DCC9]/42" />
                      <input
                        className="h-12 w-full rounded-xl border border-[#E1DCC9]/14 bg-black/38 pl-10 pr-3 text-sm text-[#E1DCC9] outline-none transition placeholder:text-[#E1DCC9]/32 focus:border-[#E1DCC9]/42"
                        placeholder="ORB-EMP-2048"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-[#E1DCC9]/62">
                      Password
                    </span>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#E1DCC9]/42" />
                      <input
                        type="password"
                        className="h-12 w-full rounded-xl border border-[#E1DCC9]/14 bg-black/38 pl-10 pr-10 text-sm text-[#E1DCC9] outline-none transition placeholder:text-[#E1DCC9]/32 focus:border-[#E1DCC9]/42"
                        placeholder="Enter secure password"
                      />
                      <Eye className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#E1DCC9]/36" />
                    </div>
                  </label>

                  <Link
                    to="/app"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E1DCC9] text-sm font-semibold text-black transition hover:bg-[#f0ead8]"
                  >
                    Open command center
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E1DCC9]/12 bg-black/22 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#E1DCC9]">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      MFA enforced
                    </div>
                    <p className="text-[11px] leading-5 text-[#E1DCC9]/50">
                      Employee access is scoped to compliance role permissions.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E1DCC9]/12 bg-black/22 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#E1DCC9]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Data boundary
                    </div>
                    <p className="text-[11px] leading-5 text-[#E1DCC9]/50">
                      No bank data leaves the private environment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
