export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-[#F8F3E2]/84 px-5 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase text-text-muted">Suraksha Hackathon prototype</p>
          <h1 className="mt-1 text-lg font-semibold text-text-primary">
            Regulation to action. Action to proof.
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative hidden min-w-80 xl:block">
            <input
              className="h-10 w-full rounded-md border border-border-default bg-white/28 px-3 text-sm text-text-primary placeholder:text-text-muted"
              placeholder="Search circular, MAP card, obligation, audit event"
            />
          </label>
        </div>
      </div>
    </header>
  );
}
