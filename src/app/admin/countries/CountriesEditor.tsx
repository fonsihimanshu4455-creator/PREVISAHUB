"use client";

import { useState, useTransition } from "react";
import { updateCountriesAction } from "../actions";
import { Field, FormCard, SaveBar, TextArea, TextInput, useSaveState } from "../_ui";
import type { Country } from "@/lib/content-types";

function newCountry(): Country {
  return {
    id: `country-${crypto.randomUUID().slice(0, 8)}`,
    flag: "🌐",
    name: "New Country",
    desc: "Describe the destination.",
    universities: "0+",
  };
}

export default function CountriesEditor({ initial }: { initial: Country[] }) {
  const [items, setItems] = useState<Country[]>(initial);
  const { saving, setSaving, message, setMessage, error, setError } = useSaveState();
  const [, startTransition] = useTransition();

  const update = (id: string, patch: Partial<Country>) =>
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => setItems((prev) => prev.filter((c) => c.id !== id));
  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setItems(next);
  };
  const moveDown = (i: number) => {
    if (i === items.length - 1) return;
    const next = [...items];
    [next[i + 1], next[i]] = [next[i], next[i + 1]];
    setItems(next);
  };

  const save = () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    startTransition(async () => {
      try {
        await updateCountriesAction(JSON.stringify(items));
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
      title="Countries"
      description="Manage study destinations shown in the Countries section."
    >
      <div className="space-y-4">
        {items.map((c, i) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-slate-500">
                #{i + 1} · {c.name || "(unnamed)"}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => moveUp(i)} className="text-slate-500 hover:text-brand-navy px-2" aria-label="Move up">↑</button>
                <button type="button" onClick={() => moveDown(i)} className="text-slate-500 hover:text-brand-navy px-2" aria-label="Move down">↓</button>
                <button type="button" onClick={() => remove(c.id)} className="text-red-600 hover:text-red-700 text-sm font-medium px-2">Delete</button>
              </div>
            </div>

            <div className="grid sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2">
                <Field label="Flag emoji">
                  <TextInput value={c.flag} maxLength={6} onChange={(e) => update(c.id, { flag: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-6">
                <Field label="Country name">
                  <TextInput value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Universities (e.g. 100+)">
                  <TextInput value={c.universities} onChange={(e) => update(c.id, { universities: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-12">
                <Field label="Description">
                  <TextArea value={c.desc} onChange={(e) => update(c.id, { desc: e.target.value })} rows={2} />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems((p) => [...p, newCountry()])}
        className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-brand-orange hover:text-brand-orange transition"
      >
        + Add Country
      </button>

      <form action={() => save()}>
        <SaveBar saving={saving} message={message} error={error} />
      </form>
    </FormCard>
  );
}
