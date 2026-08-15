"use client";

// ---------------------------------------------------------------------------
// The calling screen.
//
// A caller needs a name, a number, and one decision. Everything else — score,
// destination, visa type, source, follow-up dates, notes — belongs to the
// people who work the lead afterwards, and putting it here only slows down the
// one job this screen has.
//
// So: one list, one dropdown of five outcomes, and a way to hand a lead back
// to the admin. Picking an outcome sets the ring-back date itself and moves
// the lead on; the caller never types a date.
//
// There is no dial button. Callers work from a phone or a headset beside the
// screen, and a tel: link on a desktop opens whatever the browser feels like —
// so the number is plain text, selected in one click to copy.
// ---------------------------------------------------------------------------

import { useCallback, useState } from "react";
import { Lead, SIMPLE_OUTCOMES } from "@/lib/leads/types";

const DESCRIPTION: Record<string, string> = {
  "Call Later": "ring back in 3 days",
  "Call Tomorrow": "ring back tomorrow",
  "Not Interested": "closes this lead",
  "Switched Off": "try again tomorrow",
  "No Incoming": "try again tomorrow",
};

export default function CallingClient({
  initial,
}: {
  /** `me` is passed in rather than read from context, so the telecaller's own
   *  page at /calling can render exactly this list without the CRM shell. */
  initial: { leads: Lead[]; total: number; me: string };
}) {
  const [leads, setLeads] = useState<Lead[]>(initial.leads);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [doneCount, setDoneCount] = useState(0);

  /** Log the outcome and take the lead off the list — it has a date now. */
  const save = useCallback(async (lead: Lead, outcome: string) => {
    if (!outcome) return;
    setBusy(lead.id);
    setError("");
    const r = await fetch("/api/crm/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, outcome, notes: "", nextAction: "" }),
    }).then((x) => x.json());
    setBusy(null);
    if (r.error) return setError(r.error);
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setDoneCount((n) => n + 1);
  }, []);

  const transfer = useCallback(async (lead: Lead) => {
    if (!window.confirm(`Send ${lead.name} back to the admin?`)) return;
    setBusy(lead.id);
    setError("");
    const r = await fetch(`/api/crm/leads/${lead.id}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "" }),
    }).then((x) => x.json());
    setBusy(null);
    if (r.error) return setError(r.error);
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Calling</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">My numbers</h1>
          <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
            {initial.me} · {leads.length} to call
            {doneCount > 0 && ` · ${doneCount} done today`}
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-[color:var(--crit-soft)] px-4 py-3 text-[13.5px] text-[color:var(--crit)]">
          {error}
        </p>
      )}

      {leads.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="font-display text-[16px] font-bold">
            {doneCount > 0 ? "All done for now 🎉" : "No numbers yet"}
          </p>
          <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
            {doneCount > 0
              ? "Every number on your list has been called."
              : "The admin has not sent you any numbers yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map((l) => (
            <div
              key={l.id}
              className={`panel flex flex-wrap items-center gap-3 p-4 transition ${
                busy === l.id ? "opacity-50" : ""
              }`}
            >
              {/* Name and number — the only two things that matter here. */}
              <div className="min-w-[190px] flex-1">
                <div className="font-display text-[16px] font-bold">{l.name}</div>
                <div className="select-all text-[15px] tabular-nums text-[color:var(--text-muted)]">
                  {l.phone}
                </div>
              </div>

              <a
                href={`https://wa.me/${(l.whatsapp || l.phone).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#0f7a52] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110"
              >
                WhatsApp
              </a>

              <select
                defaultValue=""
                disabled={busy === l.id}
                onChange={(e) => {
                  save(l, e.target.value);
                  e.target.value = "";
                }}
                className="rounded-xl border-2 border-line-strong bg-surface px-3 py-2.5 text-[14px] font-semibold outline-none transition focus:border-accent disabled:opacity-50"
              >
                <option value="">What happened?</option>
                {SIMPLE_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o} — {DESCRIPTION[o]}
                  </option>
                ))}
              </select>

              <button
                onClick={() => transfer(l)}
                disabled={busy === l.id}
                title="Hand this lead back to the admin"
                className="rounded-xl border border-line-strong px-3 py-2.5 text-[13px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent disabled:opacity-50"
              >
                Transfer to admin
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
