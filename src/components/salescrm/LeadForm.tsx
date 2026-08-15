"use client";

// The Add Lead form. Every field the department captures, grouped the way the
// questions are actually asked on a first call rather than in schema order.

import { useState } from "react";
import { useCrm } from "@/components/salescrm/Shell";
import {
  CURRENT_VISA_STATUSES, DESTINATIONS, ENGLISH_TEST_STATUSES, LEAD_SOURCES,
  VISA_TYPES,
} from "@/lib/leads/types";

const input =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] outline-none transition focus:border-accent";
const label = "mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]";

export default function LeadForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user, permissions, team } = useCrm();
  const [f, setF] = useState<Record<string, string | boolean>>({
    name: "", phone: "", whatsapp: "", email: "", source: "Facebook",
    city: "", residence: "India", language: "Punjabi", age: "", occupation: "",
    destination: "Canada", visaType: "Student", currentVisaStatus: "None",
    previousRefusal: false, travelHistory: "", education: "", workExperience: "",
    englishTest: "Not Started", budget: "", expectedApplication: "",
    owner: permissions.canAssign ? "" : user.name, notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        age: f.age ? Number(f.age) : null,
        budget: f.budget ? Number(f.budget) : null,
      }),
    }).then((r) => r.json());
    setBusy(false);
    if (res.error) setError(res.error);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="my-6 w-full max-w-3xl rounded-2xl bg-surface p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">New lead</h2>
            <p className="text-[13px] text-[color:var(--text-muted)]">
              Name and phone are enough to start — the rest lifts the score.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost text-lg leading-none">
            ✕
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
            {error}
          </p>
        )}

        <fieldset className="mt-4">
          <legend className="eyebrow mb-2">Who they are</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-1">
              <span className={label}>Client name *</span>
              <input required className={input} value={String(f.name)} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label>
              <span className={label}>Mobile *</span>
              <input required className={input} value={String(f.phone)} onChange={(e) => set("phone", e.target.value)} placeholder="+91…" />
            </label>
            <label>
              <span className={label}>WhatsApp</span>
              <input className={input} value={String(f.whatsapp)} onChange={(e) => set("whatsapp", e.target.value)} placeholder="same as mobile" />
            </label>
            <label>
              <span className={label}>Email</span>
              <input type="email" className={input} value={String(f.email)} onChange={(e) => set("email", e.target.value)} />
            </label>
            <label>
              <span className={label}>City</span>
              <input className={input} value={String(f.city)} onChange={(e) => set("city", e.target.value)} />
            </label>
            <label>
              <span className={label}>Country of residence</span>
              <input className={input} value={String(f.residence)} onChange={(e) => set("residence", e.target.value)} />
            </label>
            <label>
              <span className={label}>Preferred language</span>
              <input className={input} value={String(f.language)} onChange={(e) => set("language", e.target.value)} />
            </label>
            <label>
              <span className={label}>Age</span>
              <input type="number" min={16} max={80} className={input} value={String(f.age)} onChange={(e) => set("age", e.target.value)} />
            </label>
            <label>
              <span className={label}>Occupation</span>
              <input className={input} value={String(f.occupation)} onChange={(e) => set("occupation", e.target.value)} />
            </label>
            <label>
              <span className={label}>Lead source</span>
              <select className={input} value={String(f.source)} onChange={(e) => set("source", e.target.value)}>
                {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">What they want</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className={label}>Preferred destination</span>
              <select className={input} value={String(f.destination)} onChange={(e) => set("destination", e.target.value)}>
                {DESTINATIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>Visa type</span>
              <select className={input} value={String(f.visaType)} onChange={(e) => set("visaType", e.target.value)}>
                {VISA_TYPES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>Expected application date</span>
              <input type="date" className={input} value={String(f.expectedApplication)} onChange={(e) => set("expectedApplication", e.target.value)} />
            </label>
            <label>
              <span className={label}>Current visa status</span>
              <select className={input} value={String(f.currentVisaStatus)} onChange={(e) => set("currentVisaStatus", e.target.value)}>
                {CURRENT_VISA_STATUSES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>English test</span>
              <select className={input} value={String(f.englishTest)} onChange={(e) => set("englishTest", e.target.value)}>
                {ENGLISH_TEST_STATUSES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>Budget (₹)</span>
              <input type="number" min={0} className={input} value={String(f.budget)} onChange={(e) => set("budget", e.target.value)} />
            </label>
            <label className="sm:col-span-1">
              <span className={label}>Education</span>
              <input className={input} value={String(f.education)} onChange={(e) => set("education", e.target.value)} placeholder="B.Com 2021, 65%" />
            </label>
            <label>
              <span className={label}>Work experience</span>
              <input className={input} value={String(f.workExperience)} onChange={(e) => set("workExperience", e.target.value)} placeholder="2 yrs retail" />
            </label>
            <label>
              <span className={label}>Travel history</span>
              <input className={input} value={String(f.travelHistory)} onChange={(e) => set("travelHistory", e.target.value)} placeholder="Dubai 2023" />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={Boolean(f.previousRefusal)}
              onChange={(e) => set("previousRefusal", e.target.checked)}
            />
            Previous visa refusal
          </label>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">Ownership</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={label}>Assigned to</span>
              {permissions.canAssign ? (
                <select className={input} value={String(f.owner)} onChange={(e) => set("owner", e.target.value)}>
                  <option value="">{user.name} (me)</option>
                  {team.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              ) : (
                <input className={`${input} bg-surface-sunk`} value={user.name} readOnly />
              )}
            </label>
            <label>
              <span className={label}>Notes</span>
              <input className={input} value={String(f.notes)} onChange={(e) => set("notes", e.target.value)} placeholder="What they asked for" />
            </label>
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-[color:var(--text-muted)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-accent px-5 py-2 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Create lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
