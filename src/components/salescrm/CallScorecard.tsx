"use client";

// ---------------------------------------------------------------------------
// A caller's scorecard.
//
// Two questions, both of them the caller's own: how many of each outcome, and
// how many on each day. The outcomes are the same five as the dropdown, in the
// same order, so the numbers here line up with the choices they actually made
// rather than with some other vocabulary.
//
// The admin gets the same screen with a name picker on top.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import type { CallerStats } from "@/lib/leads/callstats";

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

export default function CallScorecard({
  canPickCaller = false,
}: {
  /** Admins and managers can look at anyone's figures. */
  canPickCaller?: boolean;
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="panel p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]">
            Calls today
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold tabular-nums text-accent">
            {data.today}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]">
            Calls in range
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold tabular-nums">
            {data.total}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]">
            Days worked
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold tabular-nums">
            {data.days.length}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]">
            Calls a day
          </div>
          <div className="mt-1 font-display text-[26px] font-extrabold tabular-nums">
            {data.days.length ? Math.round(data.total / data.days.length) : 0}
          </div>
        </div>
      </div>

      {/* Every outcome in the dropdown, counted */}
      <div className="panel p-4">
        <h2 className="mb-3 font-display text-[14px] font-bold">What the calls ended in</h2>
        <div className="space-y-2">
          {data.byOutcome.map((o) => (
            <div key={o.outcome} className="flex items-center gap-3">
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
            </div>
          ))}
        </div>
      </div>

      {/* Day by day */}
      <div className="panel overflow-hidden">
        <h2 className="px-4 pt-4 font-display text-[14px] font-bold">Day by day</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="data-table w-full text-[13px]">
            <thead>
              <tr>
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-3 py-2.5 text-right">Calls</th>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-right">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.days.map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-2.5 font-medium tabular-nums">{d.date}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                    {d.total}
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c}
                      className="px-3 py-2.5 text-right tabular-nums text-[color:var(--text-muted)]"
                    >
                      {d.byOutcome[c] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
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
