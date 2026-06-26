export function UploadDropzone() {
  return (
    <div className="rounded-lg border border-dashed border-border-active bg-surface-strong p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-text-primary">Upload regulatory circular</h3>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Drop a PDF, scanned circular, or regulator notification. ORBITAL creates a checksum,
            extracts clauses, validates JSON, and generates MAP cards for accountable closure.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
            <span className="rounded-md border border-border-default px-2.5 py-1">PDF</span>
            <span className="rounded-md border border-border-default px-2.5 py-1">Scanned PDF</span>
            <span className="rounded-md border border-border-default px-2.5 py-1">Regulator URL</span>
          </div>
        </div>
        <button className="inline-flex items-center justify-center rounded-md bg-accent-cyan px-5 py-3 text-center text-sm font-semibold text-background">
          Select circular
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="block">
          <input
            className="h-11 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary placeholder:text-text-muted"
            placeholder="Paste RBI, NPCI, CERT-In, SEBI, or IRDAI source URL"
          />
        </label>
        <button className="inline-flex h-11 items-center justify-center rounded-md border border-border-default bg-surface-elevated px-5 text-center text-sm font-semibold text-text-primary">
          Verify source
        </button>
      </div>
    </div>
  );
}
