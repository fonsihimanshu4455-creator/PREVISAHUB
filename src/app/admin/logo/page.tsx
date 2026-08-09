"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import {
  PageHeader,
  Card,
  TextInput,
  NumberInput,
  ImageInput,
  Toggle,
  SaveBar,
  Loading,
} from "@/components/admin/ui";

export default function LogoPage() {
  const { draft, patch, commit, ready, savedAt } = useAdminSection("logo");
  if (!ready) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Logo"
        desc="Upload your own logo image or keep the built-in one. Control the text shown next to it and its size."
      />

      <div className="space-y-5">
        <Card title="Logo image">
          <ImageInput
            label="Logo image"
            hint="Leave empty to use the built-in Pre Visa Hub logo. PNG with transparent background works best."
            value={draft.imageUrl}
            onChange={(v) => patch({ imageUrl: v })}
          />
          <NumberInput
            label="Logo size"
            hint="Height/width of the logo mark in the navbar."
            value={draft.size}
            onChange={(v) => patch({ size: v })}
          />
        </Card>

        <Card title="Logo text">
          <Toggle
            label="Show text next to logo"
            value={draft.showText}
            onChange={(v) => patch({ showText: v })}
          />
          <TextInput label="Line 1 (brand name)" value={draft.textLine1} onChange={(v) => patch({ textLine1: v })} />
          <TextInput label="Line 2 (tagline)" value={draft.textLine2} onChange={(v) => patch({ textLine2: v })} />
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
