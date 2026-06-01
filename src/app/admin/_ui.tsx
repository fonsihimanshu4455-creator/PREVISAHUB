"use client";

import { useState } from "react";

export function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-brand-navy">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-slate-700">{children}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition ${
        props.className ?? ""
      }`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition ${
        props.className ?? ""
      }`}
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition ${
        props.className ?? ""
      }`}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export function SaveBar({
  saving,
  message,
  error,
}: {
  saving: boolean;
  message: string | null;
  error: string | null;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
      <div className="text-sm">
        {error && <span className="text-red-600">{error}</span>}
        {!error && message && <span className="text-green-600">{message}</span>}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="btn-primary disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

export function useSaveState() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return { saving, setSaving, message, setMessage, error, setError };
}
