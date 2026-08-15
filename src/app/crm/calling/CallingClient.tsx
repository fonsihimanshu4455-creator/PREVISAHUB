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
import CallScorecard from "@/components/salescrm/CallScorecard";
import type { CallQueueCounts } from "@/lib/leads/repo";
import { Lead, SIMPLE_OUTCOMES } from "@/lib/leads/types";

type Tab = "tocall" | "tomorrow" | "later" | "called" | "calls";

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: "tocall", label: "To call", empty: "Nothing due. Come back tomorrow." },
  { key: "tomorrow", label: "Tomorrow", empty: "Nothing set for tomorrow yet." },
  { key: "later", label: "Later", empty: "Nothing booked further out." },
  { key: "called", label: "Called", empty: "No calls logged yet." },
];

/** "in 3 days" / "tomorrow" / "2 days ago" — a date on its own means nothing. */
function whenLabel(iso: string): string {
  if (!iso) return "no date";
  const day = 86400000;
  const a = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(iso + "T00:00:00Z");
  if (Number.isNaN(b)) return iso;
  const d = Math.round((b - a) / day);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d < 0 ? `${-d} days ago` : `in ${d} days`;
}

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
  initial: {
    leads: Lead[];
    total: number;
    me: string;
    counts: CallQueueCounts;
    canPickCaller?: boolean;
  };
}) {
  const [tab, setTab] = useState<Tab>("tocall");
  const [counts, setCounts] = useState(initial.counts);
  const [leads, setLeads] = useState<Lead[]>(initial.leads);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [doneCount, setDoneCount] = useState(0);
  const [noted, setNoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);

  const openTab = useCallback(async (next: Tab) => {
    setTab(next);
    if (next === "calls") return;
    setLoading(true);
    setError("");
    const p = new URLSearchParams({
      bucket: "callable",
      queue: next,
      order: "calling",
      limit: "300",
    });
    const r = await fetch(`/api/crm/leads?${p}`).then((x) => x.json());
    setLoading(false);
    if (r.error) return setError(r.error);
    setLeads(Array.isArray(r.leads) ? r.leads : []);
  }, []);

  /** Re-read the tab counts after anything that moves a lead between piles. */
  const refreshCounts = useCallback(async () => {
    const r = await fetch("/api/crm/call-queue-counts").then((x) => x.json());
    if (r?.counts) setCounts(r.counts);
  }, []);

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
    refreshCounts();
  }, [refreshCounts]);

  /** Add a note without leaving the row. Appended, so nothing is overwritten. */
  const addNote = useCallback(async (lead: Lead) => {
    const note = window.prompt(`Note for ${lead.name}:`, "");
    if (!note || !note.trim()) return;
    setBusy(lead.id);
    setError("");
    const r = await fetch(`/api/crm/leads/${lead.id}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }).then((x) => x.json());
    setBusy(null);
    if (r.error) return setError(r.error);
    // Keep the row — a note is not an outcome, the number still needs calling.
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, notes: r.notes } : l))
    );
    setNoted((prev) => new Set(prev).add(lead.id));
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
    refreshCounts();
  }, [refreshCounts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Calling</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">My numbers</h1>
          <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
            {initial.me} · {counts.tocall} to call today
            {doneCount > 0 && ` · ${doneCount} done today`}
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {[
          ...TABS.map((t) => [t.key, `${t.label} (${counts[t.key as keyof CallQueueCounts]})`] as const),
          ["calls", "My calls"] as const,
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => openTab(k as Tab)}
            className={`relative whitespace-nowrap px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
              tab === k
                ? "text-[color:var(--text)]"
                : "text-[color:var(--text-faint)] hover:text-[color:var(--text-muted)]"
            }`}
          >
            {label}
            <span
              className={`absolute inset-x-2 -bottom-px h-[2px] rounded-t bg-accent transition-opacity ${
                tab === k ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        ))}
      </div>

      {tab === "calls" && <CallScorecard canPickCaller={initial.canPickCaller} />}

      {error && tab !== "calls" && (
        <p className="rounded-xl bg-[color:var(--crit-soft)] px-4 py-3 text-[13.5px] text-[color:var(--crit)]">
          {error}
        </p>
      )}

      {tab !== "calls" && (loading ? (
        <div className="panel p-10 text-center text-[13.5px] text-[color:var(--text-faint)]">
          Loading…
        </div>
      ) : leads.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="font-display text-[16px] font-bold">
            {doneCount > 0 ? "All done for now 🎉" : "Nothing here"}
          </p>
          <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
            {doneCount > 0
              ? "Every number due today has been called."
              : TABS.find((t) => t.key === tab)?.empty}
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
                {/* Why this number is in front of them, and what happened last
                    time — without it the other tabs are just a list of names. */}
                {(tab !== "tocall" || l.lastOutcome) && (
                  <div className="mt-0.5 text-[12px] text-[color:var(--text-faint)]">
                    {l.nextFollowUpDate && (
                      <span
                        className={
                          l.nextFollowUpDate <= todayIso
                            ? "font-semibold text-[color:var(--warn)]"
                            : ""
                        }
                      >
                        Call {whenLabel(l.nextFollowUpDate)}
                      </span>
                    )}
                    {l.lastOutcome && (
                      <>
                        {l.nextFollowUpDate ? " · " : ""}
                        last: {l.lastOutcome}
                        {l.lastContactDate ? ` (${whenLabel(l.lastContactDate)})` : ""}
                      </>
                    )}
                  </div>
                )}
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
                onClick={() => addNote(l)}
                disabled={busy === l.id}
                title={l.notes ? l.notes : "Add a note about this lead"}
                className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition disabled:opacity-50 ${
                  noted.has(l.id) || l.notes
                    ? "border-accent/50 bg-accent-soft text-accent"
                    : "border-line-strong text-[color:var(--text-muted)] hover:border-accent hover:text-accent"
                }`}
              >
                {noted.has(l.id) ? "Note saved" : "Note"}
              </button>

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
      ))}
    </div>
  );
}
