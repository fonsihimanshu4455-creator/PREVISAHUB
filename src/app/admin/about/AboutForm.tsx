"use client";

import { useState, useTransition } from "react";
import { updateAboutAction } from "../actions";
import { Field, FormCard, SaveBar, TextArea, TextInput, useSaveState } from "../_ui";
import type { About, Feature } from "@/lib/content-types";

function newFeature(): Feature {
  return {
    id: `feat-${crypto.randomUUID().slice(0, 8)}`,
    title: "New Feature",
    desc: "Describe it.",
  };
}

export default function AboutForm({ initial }: { initial: About }) {
  const [data, setData] = useState<About>(initial);
  const { saving, setSaving, message, setMessage, error, setError } = useSaveState();
  const [, startTransition] = useTransition();

  const setField = <K extends keyof About>(k: K, v: About[K]) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const updateFeature = (id: string, patch: Partial<Feature>) =>
    setData((prev) => ({
      ...prev,
      features: prev.features.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));

  const removeFeature = (id: string) =>
    setData((prev) => ({ ...prev, features: prev.features.filter((f) => f.id !== id) }));

  const addFeature = () =>
    setData((prev) => ({ ...prev, features: [...prev.features, newFeature()] }));

  const save = () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    startTransition(async () => {
      try {
        await updateAboutAction(JSON.stringify(data));
        setMessage("Saved. Changes are live on the website.");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <FormCard
      title="About Section"
      description="About paragraphs, the 4 feature points and the highlight statistics."
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Title — prefix">
            <TextInput value={data.titlePrefix} onChange={(e) => setField("titlePrefix", e.target.value)} />
          </Field>
          <Field label="Title — highlight (orange)">
            <TextInput value={data.titleHighlight} onChange={(e) => setField("titleHighlight", e.target.value)} />
          </Field>
        </div>

        <Field label="Paragraph 1">
          <TextArea value={data.para1} onChange={(e) => setField("para1", e.target.value)} rows={3} />
        </Field>
        <Field label="Paragraph 2">
          <TextArea value={data.para2} onChange={(e) => setField("para2", e.target.value)} rows={3} />
        </Field>

        <div className="pt-2 border-t border-slate-100">
          <div className="text-sm font-semibold text-brand-navy mb-2">Feature points</div>
          <div className="space-y-3">
            {data.features.map((f, i) => (
              <div key={f.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-500">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(f.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
                <div className="grid sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <Field label="Title">
                      <TextInput value={f.title} onChange={(e) => updateFeature(f.id, { title: e.target.value })} />
                    </Field>
                  </div>
                  <div className="sm:col-span-8">
                    <Field label="Description">
                      <TextInput value={f.desc} onChange={(e) => updateFeature(f.id, { desc: e.target.value })} />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFeature}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand-orange hover:text-brand-orange transition"
          >
            + Add Feature
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="text-sm font-semibold text-brand-navy mb-3">Statistics</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <Field label="Stat 1 — value">
                <TextInput value={data.stat1Value} onChange={(e) => setField("stat1Value", e.target.value)} />
              </Field>
              <Field label="Stat 1 — label">
                <TextInput value={data.stat1Label} onChange={(e) => setField("stat1Label", e.target.value)} />
              </Field>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <Field label="Stat 2 — value">
                <TextInput value={data.stat2Value} onChange={(e) => setField("stat2Value", e.target.value)} />
              </Field>
              <Field label="Stat 2 — label">
                <TextInput value={data.stat2Label} onChange={(e) => setField("stat2Label", e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <form action={() => save()}>
        <SaveBar saving={saving} message={message} error={error} />
      </form>
    </FormCard>
  );
}
