import { Link } from "react-router";
import { WarmCyberGridShader } from "../components/landing/WarmCyberGridShader";
import { WarmGlobeSatellites } from "../components/landing/WarmGlobeSatellites";

const palette = {
  black: "#000000",
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

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] hidden w-[min(62vw,720px)] -translate-x-1/2 -translate-y-1/2 opacity-70 lg:block">
        <div className="absolute inset-10 rounded-full bg-[#E1DCC9]/10 blur-3xl" />
        <WarmGlobeSatellites />
      </div>

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="flex w-full max-w-3xl flex-col items-center text-center">
          <h1 className="font-display text-6xl font-semibold uppercase tracking-[0.18em] text-[#E1DCC9] sm:text-8xl lg:text-9xl">
            ORBITAL
          </h1>
          <p className="mt-5 text-xl font-semibold leading-tight text-[#E1DCC9]/90 sm:text-3xl">
            Regulation to action. Action to proof.
          </p>

          <div
            className="relative mt-10 w-full max-w-md overflow-hidden rounded-[28px] border p-6 shadow-[0_34px_120px_rgba(0,0,0,0.72)] backdrop-blur-2xl sm:p-7"
            style={{
              borderColor: "rgba(225, 220, 201, 0.18)",
              background:
                "linear-gradient(145deg, rgba(31,21,12,0.58), rgba(0,0,0,0.40) 52%, rgba(65,45,21,0.48))",
              boxShadow:
                "0 34px 120px rgba(0,0,0,0.72), inset 0 1px 0 rgba(225,220,201,0.18), inset 0 -1px 0 rgba(225,220,201,0.07)",
            }}
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#E1DCC9]/12 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#E1DCC9]/50 to-transparent" />

            <div className="relative space-y-4">
              <label className="block text-left">
                <span className="mb-2 block text-xs font-medium text-[#E1DCC9]/62">
                  Employee ID
                </span>
                <input
                  className="h-12 w-full rounded-xl border border-[#E1DCC9]/14 bg-black/34 px-4 text-sm text-[#E1DCC9] outline-none transition placeholder:text-[#E1DCC9]/32 focus:border-[#E1DCC9]/42"
                  placeholder="ORB-EMP-2048"
                />
              </label>

              <label className="block text-left">
                <span className="mb-2 block text-xs font-medium text-[#E1DCC9]/62">
                  Password
                </span>
                <input
                  type="password"
                  className="h-12 w-full rounded-xl border border-[#E1DCC9]/14 bg-black/34 px-4 text-sm text-[#E1DCC9] outline-none transition placeholder:text-[#E1DCC9]/32 focus:border-[#E1DCC9]/42"
                  placeholder="Enter secure password"
                />
              </label>

              <Link
                to="/app"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#E1DCC9] text-center text-sm font-semibold text-black transition hover:bg-[#f0ead8]"
              >
                Open command center
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
