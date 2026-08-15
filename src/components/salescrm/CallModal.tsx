"use client";

// ---------------------------------------------------------------------------
// Log a call.
//
// The rules — outcome, notes, next action, next follow-up — are enforced on
// the server. This form mirrors them so the caller finds out before pressing
// save, not after, and it pre-fills the follow-up date from the outcome so
// the common case is one click.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import {
  CALL_OUTCOMES, CallOutcome, DEAD_STATUSES, LOST_REASONS, Lead,
  OUTCOME_STATUS, TERMINAL_OUTCOMES,
} from "@/lib/leads/types";

const input =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] outline-none transition focus:border-accent";
const label = "mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]";

/** How many days out the follow-up should default to, by outcome. */
const DEFAULT_GAP: Partial<Record<CallOutcome, number>> = {
  "No Answer": 1,
  Busy: 1,
  "Call Back Requested": 1,
  "Connected – Need Information": 2,
  "Connected – Interested": 2,
  "WhatsApp Sent": 2,
  "Appointment Booked": 3,
};

function addDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export default function CallModal({
  lead,
  onClose,
  onLogged,
}: {
  lead: Pick<Lead, "id" | "name" | "phone" | "status">;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [date, setDate] = useState(addDays(1));
  const [time, setTime] = useState("10:00");
  const [lostReason, setLostReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Does this outcome end the lead? Then the follow-up fields drop away and a
  // reason becomes mandatory instead.
  const closes = useMemo(() => {
    if (!outcome) return false;
    const implied = OUTCOME_STATUS[outcome];
    return (
      (implied && (DEAD_STATUSES as string[]).includes(implied)) ||
      TERMINAL_OUTCOMES.includes(outcome)
    );
  }, [outcome]);

  function pickOutcome(o: CallOutcome) {
    setOutcome(o);
    setError("");
    const gap = DEFAULT_GAP[o];
    if (gap) setDate(addDays(gap));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) return setError("Pick what happened on the call.");
    setBusy(true);
    setError("");
    const res = await fetch("/api/crm/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        outcome,
        notes,
        nextAction,
        nextFollowUpDate: closes ? "" : date,
        nextFollowUpTime: closes ? "" : time,
        lostReason: closes ? lostReason : "",
      }),
    }).then((r) => r.json());
    setBusy(false);
    if (res.error) setError(res.error);
    else onLogged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <form onSubmit={submit} className="my-8 w-full max-w-lg rounded-2xl bg-surface p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Log call — {lead.name}</h2>
            <p className="text-[13px] text-[color:var(--text-muted)]">{lead.phone}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost text-lg leading-none">✕</button>
        </div>

        <div className="mt-4">
          <span className={label}>What happened? *</span>
          <div className="flex flex-wrap gap-1.5">
            {CALL_OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pickOutcome(o)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${
                  outcome === o
                    ? "bg-accent text-white ring-accent"
                    : "bg-surface-sunk text-[color:var(--text-muted)] ring-[color:var(--line)] hover:text-[color:var(--text)]"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block">
          <span className={label}>Notes — what was said *</span>
          <textarea
            required
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={input}
            placeholder="Wants Jan intake, asked about GIC, will send documents"
          />
        </label>

        {closes ? (
          <label className="mt-4 block">
            <span className={label}>Reason * — this outcome closes the lead</span>
            <select required className={input} value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
              <option value="">Pick a reason…</option>
              {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label className="mt-4 block">
              <span className={label}>Next action *</span>
              <input
                required
                className={input}
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Send fee structure on WhatsApp, then call"
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label>
                <span className={label}>Next follow-up date *</span>
                <input required type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                <span className={label}>Time</span>
                <input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            </div>
          </>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-[color:var(--text-muted)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-accent px-5 py-2 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save call"}
          </button>
        </div>
      </form>
    </div>
  );
}
