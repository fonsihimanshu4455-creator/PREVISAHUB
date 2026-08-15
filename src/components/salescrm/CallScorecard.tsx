"use client";

// ---------------------------------------------------------------------------
// A caller's scorecard.
//
// Two questions, both of them the caller's own: how many of each outcome, and
// how many on each day. The outcomes are the same five as the dropdown, in the
// same order, so the numbers here line up with the choices they actually made
// rather than with some other vocabulary.
//
// Every number on this page is a door. A figure you cannot open is a figure you
// have to trust; clicking one takes you to the calls it counted, so "43" can be
// checked rather than believed.
//
// The admin gets the same screen with a name picker on top.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import type { CallerStats } from "@/lib/leads/callstats";
import { dayLabelFull, shortDay, todayIso } from "@/lib/leads/dates";

/** Bar colours: connected in brand blue, no-contact in muted grey, closed red. */
const TONE: Record<string, string> = {
  "Call Later": "var(--brand)",
  "Call Tomorrow": "#4a72b0",
  "Not Interested": "var(--crit)",
  "Switched Off": "#b9c2d1",
  "No Incoming": "#8fa8cd",
};

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

/** What a click on a figure means: show me the calls behind it. */
export type Drill = {
  outcome?: string;
  /** A single day. */
  date?: string;
  /** Or a range, when the figure covers one. */
  from?: string;
  to?: string;
  caller?: string;
  /** Spelled out for the chip above the results. */
  label: string;
};

export default function CallScorecard({
  canPickCaller = false,
  transferred = 0,
  onDrill,
  onOpenTransfers,
}: {
  /** Admins and managers can look at anyone's figures. */
  canPickCaller?: boolean;
  /** Handed back to the admin and not yet reassigned. */
  transferred?: number;
  onDrill?: (d: Drill) => void;
  onOpenTransfers?: () => void;
}) {
  const [days, setDays] = useState(30);
  const [caller, setCaller] = useState("");
  const [data, setData] = useState<CallerStats | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams({ days: String(days) });
    if (caller) p.set("caller", caller);
    const r = await fetch(`/api/crm/call-stats?${p}`).then((x) => x.json());
    if (r.error) setError(r.error);
    else {
      setError("");
      setData(r);
    }
  }, [days, caller]);

  useEffect(() => {
    load();
  }, [load]);

  /** The first day the current range covers — the same arithmetic the server
   *  does, so the drill-down asks for exactly what the figure counted. */
  const rangeStart = () =>
    new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const drill = (d: Omit<Drill, "caller">) =>
    onDrill?.({ ...d, caller: caller || undefined });

  if (error) {
    return <p className="panel p-5 text-[13.5px] text-[color:var(--crit)]">{error}</p>;
  }
  if (!data) {
    return <p className="panel p-5 text-[13.5px] text-[color:var(--text-faint)]">Loading…</p>;
  }

  const max = Math.max(1, ...data.byOutcome.map((o) => o.count));
  // Only the outcomes that actually happened get a column, so a table of five
  // people's habits does not become a table of eleven mostly-empty ones.
  const columns = data.byOutcome.filter((o) => o.count > 0).map((o) => o.outcome);
  const today = todayIso();
  const rangeLabel = `last ${days} days`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 transition ${
              days === r.days
                ? "bg-[color:var(--ink-800)] text-white ring-[color:var(--ink-800)]"
                : "bg-surface text-[color:var(--text-muted)] ring-[color:var(--line)] hover:text-[color:var(--text)]"
            }`}
          >
            {r.label}
          </button>
        ))}
        {canPickCaller && data.callers.length > 0 && (
          <select
            value={caller}
            onChange={(e) => setCaller(e.target.value)}
            className="ml-auto rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px]"
          >
            <option value="">Everyone</option>
            {data.callers.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile
          label="Calls today"
          value={data.today}
          hint={shortDay(today)}
          accent
          onClick={
            onDrill && data.today > 0
              ? () => drill({ date: today, label: `Calls today · ${shortDay(today)}` })
              : undefined
          }
        />
        <Tile
          label="Calls in range"
          value={data.total}
          hint={rangeLabel}
          onClick={
            onDrill && data.total > 0
              ? () =>
                  drill({
                    from: rangeStart(),
                    to: today,
                    label: `All calls · ${rangeLabel}`,
                  })
              : undefined
          }
        />
        {/* Worded and named like the tab it opens. The admin's figure is what
            is waiting on them; a caller's is what they have sent back. */}
        <Tile
          label={canPickCaller ? "Transferred in" : "I transferred"}
          value={transferred}
          hint={canPickCaller ? "waiting to be reassigned" : "sent back to the admin"}
          onClick={onOpenTransfers}
        />
        <Tile label="Days worked" value={data.days.length} hint={rangeLabel} />
        <Tile
          label="Calls a day"
          value={data.days.length ? Math.round(data.total / data.days.length) : 0}
          hint="average"
        />
      </div>

      {/* Every outcome in the dropdown, counted */}
      <div className="panel p-4">
        <h2 className="font-display text-[14px] font-bold">What the calls ended in</h2>
        <p className="mb-3 mt-0.5 text-[12px] text-[color:var(--text-faint)]">
          {onDrill ? "Tap a row to see those calls." : rangeLabel}
        </p>
        <div className="space-y-1">
          {data.byOutcome.map((o) => {
            const open =
              onDrill && o.count > 0
                ? () =>
                    drill({
                      outcome: o.outcome,
                      from: rangeStart(),
                      to: today,
                      label: `${o.outcome} · ${rangeLabel}`,
                    })
                : undefined;
            return (
              <button
                key={o.outcome}
                type="button"
                onClick={open}
                disabled={!open}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition ${
                  open ? "hover:bg-surface-sunk" : "cursor-default"
                }`}
              >
                <span className="w-[132px] shrink-0 text-[12.5px] text-[color:var(--text-muted)]">
                  {o.outcome}
                </span>
                <span className="h-[16px] flex-1 overflow-hidden rounded-[3px] bg-surface-sunk">
                  <span
                    className="block h-full rounded-[3px]"
                    style={{
                      width: `${(o.count / max) * 100}%`,
                      background: TONE[o.outcome] ?? "var(--text-faint)",
                    }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-display text-[13px] font-bold tabular-nums">
                  {o.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day by day */}
      <div className="panel overflow-hidden">
        <h2 className="px-4 pt-4 font-display text-[14px] font-bold">Day by day</h2>
        <p className="px-4 pt-0.5 text-[12px] text-[color:var(--text-faint)]">
          Newest first{onDrill ? " · tap any number to see those calls" : ""}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="data-table w-full text-[13px]">
            <thead>
              <tr>
                <th className="px-4 py-2.5 text-left">Day</th>
                <th className="px-3 py-2.5 text-right">Calls</th>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-right">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.days.map((d) => {
                const { label, detail } = dayLabelFull(d.date, today);
                return (
                  <tr key={d.date}>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="font-semibold">{label}</span>
                      {detail && (
                        <span className="ml-1.5 text-[12px] text-[color:var(--text-faint)]">
                          {detail}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Cell
                        n={d.total}
                        bold
                        onClick={
                          onDrill
                            ? () =>
                                drill({
                                  date: d.date,
                                  label: `All calls · ${label}${
                                    detail ? ` ${detail}` : ""
                                  }`,
                                })
                            : undefined
                        }
                      />
                    </td>
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2.5 text-right">
                        <Cell
                          n={d.byOutcome[c] ?? 0}
                          onClick={
                            onDrill && d.byOutcome[c]
                              ? () =>
                                  drill({
                                    date: d.date,
                                    outcome: c,
                                    label: `${c} · ${label}${
                                      detail ? ` ${detail}` : ""
                                    }`,
                                  })
                              : undefined
                          }
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
              {data.days.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-4 py-10 text-center text-[color:var(--text-faint)]"
                  >
                    No calls logged in this range yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** A headline figure. A tile with somewhere to go is underlined on hover; one
 *  without stays flat, so it is obvious which numbers can be opened. */
function Tile({
  label,
  value,
  hint,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`panel p-4 text-left transition ${
        onClick
          ? "hover:-translate-y-px hover:border-accent hover:shadow-sm"
          : "cursor-default"
      }`}
    >
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-[26px] font-extrabold tabular-nums ${
          accent ? "text-accent" : ""
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-[color:var(--text-faint)]">{hint}</div>
      )}
    </button>
  );
}

/** A number in the grid. Zero stays a dash — a dash is quieter than a 0 and
 *  there is nothing behind it to open. */
function Cell({
  n,
  bold,
  onClick,
}: {
  n: number;
  bold?: boolean;
  onClick?: () => void;
}) {
  if (!n) return <span className="text-[color:var(--text-faint)]">—</span>;
  const cls = `tabular-nums ${bold ? "font-bold" : "text-[color:var(--text-muted)]"}`;
  if (!onClick) return <span className={cls}>{n}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} rounded px-1.5 py-0.5 underline decoration-dotted underline-offset-4 transition hover:bg-surface-sunk hover:text-accent`}
    >
      {n}
    </button>
  );
}
