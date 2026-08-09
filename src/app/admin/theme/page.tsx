"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import { PageHeader, Card, ColorInput, SaveBar, Loading } from "@/components/admin/ui";

export default function ThemePage() {
  const { draft, patch, commit, ready, savedAt } = useAdminSection("theme");
  if (!ready) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Theme & Colours"
        desc="Change the brand colours used everywhere on the website. Save and reload the site to see the new look."
      />

      <div className="space-y-5">
        <Card title="Orange (primary)">
          <ColorInput label="Orange" value={draft.orange} onChange={(v) => patch({ orange: v })} />
          <ColorInput label="Orange dark" value={draft.orangeDark} onChange={(v) => patch({ orangeDark: v })} />
          <ColorInput label="Orange light" value={draft.orangeLight} onChange={(v) => patch({ orangeLight: v })} />
        </Card>

        <Card title="Navy (secondary)">
          <ColorInput label="Navy" value={draft.navy} onChange={(v) => patch({ navy: v })} />
          <ColorInput label="Navy dark" value={draft.navyDark} onChange={(v) => patch({ navyDark: v })} />
          <ColorInput label="Navy light" value={draft.navyLight} onChange={(v) => patch({ navyLight: v })} />
        </Card>

        <Card title="Background">
          <ColorInput label="Cream" value={draft.cream} onChange={(v) => patch({ cream: v })} />
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
