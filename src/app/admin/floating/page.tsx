"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import {
  PageHeader,
  Card,
  TextArea,
  NumberInput,
  Toggle,
  SaveBar,
  Loading,
} from "@/components/admin/ui";

export default function FloatingPage() {
  const { draft, patch, commit, ready, savedAt } = useAdminSection("floatingCTA");
  if (!ready) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Floating WhatsApp Button"
        desc="The round green WhatsApp button fixed in the bottom-right corner of the site."
      />

      <div className="space-y-5">
        <Card title="Settings">
          <Toggle label="Show floating button" value={draft.enabled} onChange={(v) => patch({ enabled: v })} />
          <NumberInput label="Button size" value={draft.size} onChange={(v) => patch({ size: v })} />
          <TextArea
            label="Pre-filled message"
            hint="The message that opens in WhatsApp when a visitor taps the button."
            value={draft.message}
            onChange={(v) => patch({ message: v })}
          />
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
