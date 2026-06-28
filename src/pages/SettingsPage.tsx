import { Database, KeyRound, ServerCog, ShieldCheck } from "lucide-react";
import { PageContainer, PageHeader } from "../components/ui/layout";
import { Panel, PanelHeader } from "../components/ui/panel";
import { StatusPill } from "../components/ui/badges";

export function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader eyebrow="Settings" title="Private deployment controls">
        Prototype controls for model routing, schema validation, storage, and audit policy.
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        {[
          ["Model endpoint", "Qwen2.5-7B QLoRA extractor", ServerCog, "online"],
          ["Vector database", "ChromaDB policy index", Database, "indexed"],
          ["Credential boundary", "Private bank network only", KeyRound, "locked"],
          ["Audit policy", "Human sign-off required", ShieldCheck, "enforced"],
        ].map(([title, copy, Icon, status]) => (
          <Panel key={title as string}>
            <PanelHeader title={title as string} eyebrow="Configuration" action={<StatusPill status={status as string} />} />
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-accent-cyan/10 p-3 text-accent-cyan">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{copy as string}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  This setting is shown for the frontend prototype and would be controlled by bank infrastructure administrators.
                </p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </PageContainer>
  );
}
