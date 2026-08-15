"use client";

// Edit a lead without leaving the list.
//
// Imported leads arrive with a phone number and not much else, so the fields
// here are the ones somebody actually fills in after the first call — the name
// they gave, where they want to go, and the details the score is built from.

import { useState } from "react";
import { useCrm } from "@/components/salescrm/Shell";
import {
  CURRENT_VISA_STATUSES, DESTINATIONS, ENGLISH_TEST_STATUSES, LEAD_SOURCES,
  LEAD_STATUSES, LOST_REASONS, Lead, REASON_REQUIRED, VISA_TYPES,
} from "@/lib/leads/types";

const input =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] outline-none transition focus:border-accent";
const label = "mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]";

export default function EditLeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: (updated: Lead) => void;
}) {
  const { permissions, team } = useCrm();
  const [f, setF] = useState({
    name: lead.name,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    email: lead.email,
    city: lead.city,
    source: lead.source as string,
    destination: lead.destination,
    visaType: lead.visaType as string,
    currentVisaStatus: lead.currentVisaStatus,
    englishTest: lead.englishTest,
    education: lead.education,
    workExperience: lead.workExperience,
    occupation: lead.occupation,
    budget: lead.budget === null ? "" : String(lead.budget),
    expectedApplication: lead.expectedApplication,
    status: lead.status as string,
    lostReason: lead.lostReason,
    owner: lead.owner,
    nextFollowUpDate: lead.nextFollowUpDate,
    nextFollowUpTime: lead.nextFollowUpTime,
    notes: lead.notes,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const closing = REASON_REQUIRED.includes(f.status as never);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body: Record<string, unknown> = {
      ...f,
      budget: f.budget === "" ? null : Number(f.budget),
    };
    // Ownership is a manager's call; sending it from an executive would just
    // be refused, so it is not sent at all.
    if (!permissions.canAssign) delete body.owner;

    const r = await fetch(`/api/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    setBusy(false);
    if (r.error) setError(r.error);
    else onSaved(r.lead);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="my-6 w-full max-w-3xl rounded-2xl bg-surface p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Edit lead</h2>
            <p className="text-[13px] text-[color:var(--text-muted)]">
              {lead.id} · added {lead.createdAt.slice(0, 10)}
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
            <label>
              <span className={label}>Name *</span>
              <input required className={input} value={f.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label>
              <span className={label}>Mobile *</span>
              <input required className={input} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            <label>
              <span className={label}>WhatsApp</span>
              <input className={input} value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </label>
            <label>
              <span className={label}>Email</span>
              <input className={input} value={f.email} onChange={(e) => set("email", e.target.value)} />
            </label>
            <label>
              <span className={label}>City</span>
              <input className={input} value={f.city} onChange={(e) => set("city", e.target.value)} />
            </label>
            <label>
              <span className={label}>Occupation</span>
              <input className={input} value={f.occupation} onChange={(e) => set("occupation", e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">What they want — this is what sets the score</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className={label}>Destination</span>
              <select className={input} value={f.destination} onChange={(e) => set("destination", e.target.value)}>
                <option value="">Not known yet</option>
                {DESTINATIONS.map((c) => <option key={c}>{c}</option>)}
                {f.destination && !DESTINATIONS.includes(f.destination as never) && (
                  <option>{f.destination}</option>
                )}
              </select>
            </label>
            <label>
              <span className={label}>Visa type</span>
              <select className={input} value={f.visaType} onChange={(e) => set("visaType", e.target.value)}>
                {VISA_TYPES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>Expected application</span>
              <input type="date" className={input} value={f.expectedApplication} onChange={(e) => set("expectedApplication", e.target.value)} />
            </label>
            <label>
              <span className={label}>Education</span>
              <input className={input} value={f.education} onChange={(e) => set("education", e.target.value)} placeholder="B.Com 2021, 65%" />
            </label>
            <label>
              <span className={label}>Work experience</span>
              <input className={input} value={f.workExperience} onChange={(e) => set("workExperience", e.target.value)} />
            </label>
            <label>
              <span className={label}>Budget (₹)</span>
              <input type="number" min={0} className={input} value={f.budget} onChange={(e) => set("budget", e.target.value)} />
            </label>
            <label>
              <span className={label}>English test</span>
              <select className={input} value={f.englishTest} onChange={(e) => set("englishTest", e.target.value)}>
                {ENGLISH_TEST_STATUSES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>Current visa</span>
              <select className={input} value={f.currentVisaStatus} onChange={(e) => set("currentVisaStatus", e.target.value)}>
                {CURRENT_VISA_STATUSES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>Source</span>
              <select className={input} value={f.source} onChange={(e) => set("source", e.target.value)}>
                {LEAD_SOURCES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">Where it stands</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className={label}>Status</span>
              <select className={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            {closing && (
              <label>
                <span className={label}>Reason *</span>
                <select required className={input} value={f.lostReason} onChange={(e) => set("lostReason", e.target.value)}>
                  <option value="">Pick a reason…</option>
                  {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
            )}
            {permissions.canAssign && (
              <label>
                <span className={label}>Assigned to</span>
                <select className={input} value={f.owner} onChange={(e) => set("owner", e.target.value)}>
                  <option value="">Nobody yet</option>
                  {team.map((t) => <option key={t.id}>{t.name}</option>)}
                  {f.owner && !team.some((t) => t.name === f.owner) && <option>{f.owner}</option>}
                </select>
              </label>
            )}
            <label>
              <span className={label}>Next follow-up</span>
              <input type="date" className={input} value={f.nextFollowUpDate} onChange={(e) => set("nextFollowUpDate", e.target.value)} />
            </label>
            <label>
              <span className={label}>Time</span>
              <input type="time" className={input} value={f.nextFollowUpTime} onChange={(e) => set("nextFollowUpTime", e.target.value)} />
            </label>
          </div>
          <label className="mt-3 block">
            <span className={label}>Notes</span>
            <textarea rows={3} className={input} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
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
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
