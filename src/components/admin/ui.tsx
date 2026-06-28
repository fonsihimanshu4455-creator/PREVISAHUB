"use client";

import { useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Reusable admin form controls. Every editable text, image and size on the
// site is edited through one of these.
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-bold text-slate-800">{title}</h1>
      {desc && <p className="mt-1 text-slate-500">{desc}</p>}
    </div>
  );
}

export function Loading() {
  return <div className="py-20 text-center text-slate-400">Loading…</div>;
}

export function Card({
  title,
  desc,
  children,
}: {
  title?: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      {title && <h3 className="font-display text-lg font-bold text-slate-800">{title}</h3>}
      {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
      <div className={title ? "mt-4 space-y-4" : "space-y-4"}>{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {hint && <span className="block text-xs text-slate-400 mb-1">{hint}</span>}
      <div className={hint ? "" : "mt-1"}>{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition";

export function TextInput({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className={inputCls}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  hint,
  suffix = "px",
  min = 0,
  max = 2000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={inputCls}
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="text-sm text-slate-400 w-8">{suffix}</span>
      </div>
    </Field>
  );
}

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
        />
        <input
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full rounded-lg border border-slate-300 px-3 py-2"
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          value ? "bg-orange-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function ImageInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_500_000) {
      alert("Image is large (over ~1.5 MB). Please use a smaller image to avoid storage limits.");
    }
    setBusy(true);
    try {
      const url = await fileToDataUrl(file);
      onChange(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="preview" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-400">None</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

// Sticky save bar shown at the bottom of every editor page.
export function SaveBar({
  onSave,
  savedAt,
}: {
  onSave: () => void;
  savedAt: number;
}) {
  const [justSaved, setJustSaved] = useState(false);

  const save = () => {
    onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-8 border-t border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between">
      <span className="text-sm text-slate-500">
        {justSaved || (savedAt > 0) ? "✓ Saved — open the website to see changes." : "Unsaved changes"}
      </span>
      <button
        onClick={save}
        className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-600 transition"
      >
        Save changes
      </button>
    </div>
  );
}

// Small toolbar used inside list editors (add / remove / move).
export function ItemToolbar({
  index,
  count,
  onUp,
  onDown,
  onRemove,
}: {
  index: number;
  count: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onUp}
        disabled={index === 0}
        className="h-7 w-7 rounded border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50"
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={index === count - 1}
        className="h-7 w-7 rounded border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50"
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="h-7 w-7 rounded border border-red-200 text-red-500 hover:bg-red-50"
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  );
}

// Generic helpers for editing arrays immutably.
export function arrayUpdate<T>(arr: T[], index: number, patch: Partial<T>): T[] {
  return arr.map((it, i) => (i === index ? { ...it, ...patch } : it));
}
export function arrayRemove<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
