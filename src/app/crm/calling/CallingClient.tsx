"use client";

// ---------------------------------------------------------------------------
// The calling screen.
//
// A caller needs a name, a number, what was said last time, and one decision.
// Everything else — score, destination, visa type, source — belongs to the
// people who work the lead afterwards.
//
// The piles are DATED rather than relative. "Tomorrow" reads well for a day and
// then lies: the lead you set for tomorrow sits in "to call" tomorrow, and the
// tab called "tomorrow" has quietly become a different day. So work booked
// ahead is grouped under real dates, and the history is grouped under the date
// each call was actually made.
//
// There is no dial button. Callers work from a phone beside the screen, and a
// tel: link on a desktop opens whatever the browser feels like — so the number
// is plain text, selected in one click to copy.
// ---------------------------------------------------------------------------

import { useCallback, useState } from "react";
import CallScorecard, { type Drill } from "@/components/salescrm/CallScorecard";
import type { CallLog } from "@/lib/leads/calls";
import type { CallQueueCounts } from "@/lib/leads/repo";
import { dayLabel, dayLabelFull, timeOf, todayIso } from "@/lib/leads/dates";
import { Lead, SIMPLE_OUTCOMES } from "@/lib/leads/types";

type Tab = "tocall" | "upcoming" | "transferred" | "called" | "calls";

const DESCRIPTION: Record<string, string> = {
  "Call Later": "ring back in 3 days",
  "Call Tomorrow": "ring back tomorrow",
  "Not Interested": "closes this lead",
  "Switched Off": "try again tomorrow",
  "No Incoming": "try again tomorrow",
};

/** Bucket by date, keeping the order the rows arrived in. */
function groupByDate<T>(items: T[], dateOf: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = dateOf(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return [...map.entries()];
}

export default function CallingClient({
  initial,
}: {
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
  const [history, setHistory] = useState<CallLog[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneCount, setDoneCount] = useState(0);
  /** Set when the reader arrived at the history from a figure on the scorecard.
   *  Kept beside the rows as a chip so it is never a mystery why the list is
   *  short, and removable in one click. */
  const [drill, setDrill] = useState<Drill | null>(null);
  const today = todayIso();

  const refreshCounts = useCallback(async () => {
    const r = await fetch("/api/crm/call-queue-counts").then((x) => x.json());
    if (r?.counts) setCounts(r.counts);
  }, []);

  /** The call history, optionally narrowed to what a scorecard figure counted.
   *  The dates go to the server so the range is exact; the outcome is matched
   *  here, because a day never has enough calls for that to be worth a query. */
  const loadHistory = useCallback(async (d: Drill | null) => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams({ limit: "500" });
    if (d?.date) {
      p.set("from", d.date);
      p.set("to", d.date);
    } else if (d?.from) {
      p.set("from", d.from);
      if (d.to) p.set("to", d.to);
    }
    if (d?.caller) p.set("caller", d.caller);
    const r = await fetch(`/api/crm/calls?${p}`).then((x) => x.json());
    setLoading(false);
    if (r.error) return setError(r.error);
    setHistory(Array.isArray(r.calls) ? r.calls : []);
    setHistoryLoaded(true);
  }, []);

  const openTab = useCallback(async (next: Tab) => {
    setTab(next);
    if (next === "calls") return;
    setDrill(null);
    if (next === "called") return loadHistory(null);
    setLoading(true);
    setError("");
    const p = new URLSearchParams({ bucket: "callable", order: "calling", limit: "300" });
    if (next === "transferred") {
      // A caller wants the ones they sent back; the admin wants the ones
      // waiting on them. Same tab, two different questions.
      if (initial.canPickCaller) p.set("queue", "transferred");
      else p.set("transferredFrom", initial.me);
    } else {
      p.set("queue", next);
    }
    const r = await fetch(`/api/crm/leads?${p}`).then((x) => x.json());
    setLoading(false);
    if (r.error) return setError(r.error);
    setLeads(Array.isArray(r.leads) ? r.leads : []);
  }, [loadHistory]);

  /** A figure on the scorecard was clicked: show the calls it counted. */
  const openDrill = useCallback(
    (d: Drill) => {
      setTab("called");
      setDrill(d);
      loadHistory(d);
    },
    [loadHistory]
  );

  const save = useCallback(
    async (lead: Lead, outcome: string) => {
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
    },
    [refreshCounts]
  );

  /** Appended, so nothing anyone wrote before is lost. The row stays put —
   *  a note is not an outcome and the number still needs ringing. */
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
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, notes: r.notes } : l))
    );
  }, []);

  const transfer = useCallback(
    async (lead: Lead) => {
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
    },
    [refreshCounts]
  );

  const row = (l: Lead) => (
    <div
      key={l.id}
      className={`panel flex flex-wrap items-center gap-3 p-4 transition ${
        busy === l.id ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-[230px] flex-1">
        <div className="font-display text-[16px] font-bold">{l.name}</div>
        <div className="select-all text-[15px] tabular-nums text-[color:var(--text-muted)]">
          {l.phone}
        </div>
        {l.transferredFrom && (
          <div className="mt-0.5 text-[12px] font-semibold text-[color:var(--warn)]">
            Transferred by {l.transferredFrom}
            {l.transferredAt
              ? ` · ${dayLabel(l.transferredAt.slice(0, 10), today).toLowerCase()}`
              : ""}
          </div>
        )}
        {l.lastOutcome && (
          <div className="mt-0.5 text-[12px] text-[color:var(--text-faint)]">
            last: {l.lastOutcome}
            {l.lastContactDate
              ? ` · ${dayLabel(l.lastContactDate, today).toLowerCase()}`
              : ""}
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
        className="rounded-xl border border-line-strong px-3 py-2.5 text-[13px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        Note
      </button>
      <button
        onClick={() => transfer(l)}
        disabled={busy === l.id}
        title="Hand this lead back to the admin"
        className="rounded-xl border border-line-strong px-3 py-2.5 text-[13px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        Transfer to admin
      </button>

      {/* Under the buttons, on its own line: everything anyone has written
          about this person, oldest first. Full width because a note is a
          sentence, not a label — squeezed beside the number it made every row
          a different height and the text a column three words wide. */}
      {l.notes && (
        <p className="w-full whitespace-pre-line rounded-lg bg-surface-sunk px-3 py-2 text-[12.5px] leading-snug text-[color:var(--text-muted)]">
          {l.notes}
        </p>
      )}
    </div>
  );

  /** "Today · Sat 15 Aug — 6 numbers". The familiar word tells you where you
   *  are; the date beside it settles which day that actually was. */
  const heading = (iso: string, count: number, noun = "number") => {
    const { label, detail } = dayLabelFull(iso, today);
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 pt-2">
        <h2 className="font-display text-[15px] font-bold">
          {iso ? label : "No date yet"}
        </h2>
        {detail && (
          <span className="text-[13px] text-[color:var(--text-muted)]">{detail}</span>
        )}
        <span className="text-[12.5px] text-[color:var(--text-faint)]">
          · {count} {count === 1 ? noun : `${noun}s`}
        </span>
      </div>
    );
  };

  // The dates were asked of the server; only the outcome is narrowed here.
  const shownHistory = drill?.outcome
    ? history.filter((c) => c.outcome === drill.outcome)
    : history;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "tocall", label: "To call", count: counts.tocall },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    {
      key: "transferred",
      label: initial.canPickCaller ? "Transferred in" : "I transferred",
      count: counts.transferred,
    },
    // Deliberately not counts.called: that counts leads that have been rung at
    // least once, while this tab lists calls. A lead rung three times is one
    // there and three here, so the tab showed a number its own list contradicted.
    // Once the history is loaded the tab says how many rows are actually below it.
    { key: "called", label: "Call history", count: historyLoaded ? shownHistory.length : undefined },
    { key: "calls", label: "My calls" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Calling</p>
        <h1 className="mt-1 font-display text-display-lg font-bold">My numbers</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
          {initial.me} · {counts.tocall} to call today
          {doneCount > 0 && ` · ${doneCount} done`}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => openTab(t.key)}
            className={`relative whitespace-nowrap px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
              tab === t.key
                ? "text-[color:var(--text)]"
                : "text-[color:var(--text-faint)] hover:text-[color:var(--text-muted)]"
            }`}
          >
            {t.label}
            {t.count !== undefined && ` (${t.count})`}
            <span
              className={`absolute inset-x-2 -bottom-px h-[2px] rounded-t bg-accent transition-opacity ${
                tab === t.key ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-[color:var(--crit-soft)] px-4 py-3 text-[13.5px] text-[color:var(--crit)]">
          {error}
        </p>
      )}

      {tab === "calls" && (
        <CallScorecard
          canPickCaller={initial.canPickCaller}
          transferred={counts.transferred}
          onDrill={openDrill}
          onOpenTransfers={() => openTab("transferred")}
        />
      )}

      {loading && (
        <div className="panel p-10 text-center text-[13.5px] text-[color:var(--text-faint)]">
          Loading…
        </div>
      )}

      {/* Due now — one flat list, worked top to bottom. */}
      {!loading &&
        tab === "tocall" &&
        (leads.length === 0 ? (
          <div className="panel p-12 text-center">
            <p className="font-display text-[16px] font-bold">
              {doneCount > 0 ? "All done for now 🎉" : "Nothing due"}
            </p>
            <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
              {doneCount > 0
                ? "Every number due today has been called."
                : counts.upcoming > 0
                ? `Nothing to call today — ${counts.upcoming} booked for later, see Upcoming.`
                : "The admin has not sent you any numbers yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">{leads.map(row)}</div>
        ))}

      {/* Handed back: what the caller sent up, or what is waiting on the admin. */}
      {!loading &&
        tab === "transferred" &&
        (leads.length === 0 ? (
          <div className="panel p-12 text-center text-[13.5px] text-[color:var(--text-muted)]">
            {initial.canPickCaller
              ? "Nobody has sent anything back."
              : "You have not sent anything back to the admin."}
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[13px] text-[color:var(--text-muted)]">
              {initial.canPickCaller
                ? "Sent back by a caller and not yet given to anyone. Assign them from Leads."
                : "Sent back to the admin. They stay here until the admin gives them to someone."}
            </p>
            {leads.map(row)}
          </div>
        ))}

      {/* Booked ahead — under the date they are actually booked for. */}
      {!loading &&
        tab === "upcoming" &&
        (leads.length === 0 ? (
          <div className="panel p-12 text-center text-[13.5px] text-[color:var(--text-muted)]">
            Nothing booked ahead.
          </div>
        ) : (
          <div className="space-y-4">
            {groupByDate(leads, (l) => l.nextFollowUpDate).map(([date, items]) => (
              <div key={date} className="space-y-2.5">
                {heading(date, items.length)}
                {items.map(row)}
              </div>
            ))}
          </div>
        ))}

      {/* What was actually called, and when. */}
      {!loading && tab === "called" && (
        <div className="space-y-4">
          {drill && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-[color:var(--text-muted)]">
                Showing
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-sunk px-3 py-1.5 text-[12.5px] font-semibold">
                {drill.label}
                <button
                  onClick={() => openTab("called")}
                  title="Show every call again"
                  className="text-[color:var(--text-faint)] transition hover:text-[color:var(--crit)]"
                >
                  ✕
                </button>
              </span>
              <button
                onClick={() => openTab("calls")}
                className="text-[12.5px] font-semibold text-accent hover:underline"
              >
                ← Back to my calls
              </button>
            </div>
          )}

          {shownHistory.length === 0 ? (
            <div className="panel p-12 text-center text-[13.5px] text-[color:var(--text-muted)]">
              {drill ? "No calls match that." : "No calls logged yet."}
            </div>
          ) : (
            groupByDate(shownHistory, (c) => c.calledAt.slice(0, 10)).map(
              ([date, items]) => (
                <div key={date}>
                  {heading(date, items.length, "call")}
                  <div className="panel mt-2 overflow-hidden">
                    <table className="data-table w-full text-[13.5px]">
                      <tbody>
                        {items.map((c) => (
                          <tr key={c.id}>
                            <td className="w-16 px-4 py-2.5 tabular-nums text-[color:var(--text-faint)]">
                              {timeOf(c.calledAt)}
                            </td>
                            <td className="px-3 py-2.5 font-semibold">{c.leadName}</td>
                            <td className="select-all px-3 py-2.5 tabular-nums text-[color:var(--text-muted)]">
                              {c.phone}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {c.outcome}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}
