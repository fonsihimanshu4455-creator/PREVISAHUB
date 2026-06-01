"use client";

import { useState, useTransition } from "react";
import { updateServicesAction } from "../actions";
import { Field, FormCard, SaveBar, SelectInput, TextArea, TextInput, useSaveState } from "../_ui";
import { SERVICE_COLORS, type Service } from "@/lib/content-types";

function newService(): Service {
  return {
    id: `svc-${crypto.randomUUID().slice(0, 8)}`,
    icon: "✨",
    title: "New Service",
    desc: "Describe this service.",
    color: SERVICE_COLORS[0].value,
  };
}

export default function ServicesEditor({ initial }: { initial: Service[] }) {
  const [items, setItems] = useState<Service[]>(initial);
  const { saving, setSaving, message, setMessage, error, setError } = useSaveState();
  const [, startTransition] = useTransition();

  const update = (id: string, patch: Partial<Service>) =>
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const remove = (id: string) => setItems((prev) => prev.filter((s) => s.id !== id));

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
        await updateServicesAction(JSON.stringify(items));
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
      title="Services"
      description="Add, edit, reorder or remove services. Icons can be any emoji."
    >
      <div className="space-y-4">
        {items.map((s, i) => (
          <div
            key={s.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-slate-500">
                #{i + 1} · {s.title || "(untitled)"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  className="text-slate-500 hover:text-brand-navy px-2"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(i)}
                  className="text-slate-500 hover:text-brand-navy px-2"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium px-2"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2">
                <Field label="Icon">
                  <TextInput
                    value={s.icon}
                    maxLength={4}
                    onChange={(e) => update(s.id, { icon: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-5">
                <Field label="Title">
                  <TextInput
                    value={s.title}
                    onChange={(e) => update(s.id, { title: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-5">
                <Field label="Color theme">
                  <SelectInput
                    value={s.color}
                    onChange={(e) => update(s.id, { color: e.target.value })}
                  >
                    {SERVICE_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              <div className="sm:col-span-12">
                <Field label="Description">
                  <TextArea
                    value={s.desc}
                    onChange={(e) => update(s.id, { desc: e.target.value })}
                    rows={2}
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems((p) => [...p, newService()])}
        className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-brand-orange hover:text-brand-orange transition"
      >
        + Add Service
      </button>

      <form
        action={(formData) => {
          formData.set("_", "_");
          save();
        }}
      >
        <SaveBar saving={saving} message={message} error={error} />
      </form>
    </FormCard>
  );
}
