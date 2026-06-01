"use client";

import { useTransition } from "react";
import { updateHeroAction } from "../actions";
import { Field, FormCard, SaveBar, TextArea, TextInput, useSaveState } from "../_ui";
import type { Hero } from "@/lib/content-types";

export default function HeroForm({ initial }: { initial: Hero }) {
  const { saving, setSaving, message, setMessage, error, setError } = useSaveState();
  const [, startTransition] = useTransition();

  return (
    <FormCard
      title="Hero Section"
      description="The first thing visitors see — banner heading, tagline, CTAs and the 3 statistics."
    >
      <form
        action={(formData) => {
          setError(null);
          setMessage(null);
          setSaving(true);
          startTransition(async () => {
            try {
              await updateHeroAction(formData);
              setMessage("Saved. Changes are live on the website.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setSaving(false);
            }
          });
        }}
        className="space-y-4"
      >
        <Field label="Top badge">
          <TextInput name="badge" defaultValue={initial.badge} required />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Title — prefix">
            <TextInput name="titlePrefix" defaultValue={initial.titlePrefix} required />
          </Field>
          <Field label="Title — highlight (orange)">
            <TextInput
              name="titleHighlight"
              defaultValue={initial.titleHighlight}
              required
            />
          </Field>
          <Field label="Title — suffix">
            <TextInput name="titleSuffix" defaultValue={initial.titleSuffix} required />
          </Field>
        </div>

        <Field label="Description paragraph">
          <TextArea name="description" defaultValue={initial.description} required rows={4} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primary button text">
            <TextInput
              name="primaryCtaText"
              defaultValue={initial.primaryCtaText}
              required
            />
          </Field>
          <Field label="Secondary button text">
            <TextInput
              name="secondaryCtaText"
              defaultValue={initial.secondaryCtaText}
              required
            />
          </Field>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="text-sm font-semibold text-brand-navy">Statistics</div>
          <div className="mt-3 grid sm:grid-cols-3 gap-4">
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <Field label="Stat 1 — value">
                <TextInput name="stat1Value" defaultValue={initial.stat1Value} />
              </Field>
              <Field label="Stat 1 — label">
                <TextInput name="stat1Label" defaultValue={initial.stat1Label} />
              </Field>
            </div>
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <Field label="Stat 2 — value">
                <TextInput name="stat2Value" defaultValue={initial.stat2Value} />
              </Field>
              <Field label="Stat 2 — label">
                <TextInput name="stat2Label" defaultValue={initial.stat2Label} />
              </Field>
            </div>
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <Field label="Stat 3 — value">
                <TextInput name="stat3Value" defaultValue={initial.stat3Value} />
              </Field>
              <Field label="Stat 3 — label">
                <TextInput name="stat3Label" defaultValue={initial.stat3Label} />
              </Field>
            </div>
          </div>
        </div>

        <SaveBar saving={saving} message={message} error={error} />
      </form>
    </FormCard>
  );
}
