// ---------------------------------------------------------------------------
// What a caller did, counted.
//
// One question, asked two ways: how many of each outcome, and how many on each
// day. Both come out of one pass over the call log, so the totals down the side
// and the totals across the days can never disagree.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";
import { CALL_OUTCOMES, CallOutcome, SIMPLE_OUTCOMES } from "./types";

export type DayRow = {
  date: string;
  total: number;
  /** Outcome name → how many that day. */
  byOutcome: Record<string, number>;
};

export type CallerStats = {
  caller: string;
  total: number;
  today: number;
  /** Every outcome that has ever been used, most-used first. */
  byOutcome: { outcome: string; count: number }[];
  /** Newest day first. */
  days: DayRow[];
  /** For the admin: everyone who has logged a call. */
  callers: string[];
};

export async function callerStats(
  caller?: string,
  days = 30
): Promise<CallerStats> {
  const empty: CallerStats = {
    caller: caller ?? "",
    total: 0,
    today: 0,
    // Show the five a caller uses even at zero, so an empty day still reads as
    // a scorecard rather than a blank page.
    byOutcome: SIMPLE_OUTCOMES.map((o) => ({ outcome: o, count: 0 })),
    days: [],
    callers: [],
  };
  if (!sql) return empty;
  await ensureLeadSchema();

  const scope = caller ? sql`lower(caller) = lower(${caller})` : sql`TRUE`;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const [rows, people] = await Promise.all([
    sql<{ day: string; outcome: string; n: string }[]>`
      SELECT to_char(called_at, 'YYYY-MM-DD') AS day, outcome, COUNT(*) AS n
      FROM lead_calls
      WHERE ${scope} AND called_at >= ${since}::date
      GROUP BY 1, 2
      ORDER BY 1 DESC
    `,
    caller
      ? Promise.resolve([] as { caller: string }[])
      : sql<{ caller: string }[]>`
          SELECT DISTINCT caller FROM lead_calls WHERE caller <> '' ORDER BY caller
        `,
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const dayMap = new Map<string, DayRow>();
  const totals = new Map<string, number>();
  let total = 0;

  for (const r of rows) {
    const n = Number(r.n);
    total += n;
    totals.set(r.outcome, (totals.get(r.outcome) ?? 0) + n);
    let d = dayMap.get(r.day);
    if (!d) {
      d = { date: r.day, total: 0, byOutcome: {} };
      dayMap.set(r.day, d);
    }
    d.total += n;
    d.byOutcome[r.outcome] = (d.byOutcome[r.outcome] ?? 0) + n;
  }

  // The five simple ones always appear, in their dropdown order; anything else
  // that has actually been used is listed after them.
  const known = new Set<string>(SIMPLE_OUTCOMES);
  const byOutcome = [
    ...SIMPLE_OUTCOMES.map((o) => ({ outcome: o as string, count: totals.get(o) ?? 0 })),
    ...(CALL_OUTCOMES as readonly string[])
      .filter((o) => !known.has(o as CallOutcome) && (totals.get(o) ?? 0) > 0)
      .map((o) => ({ outcome: o, count: totals.get(o) ?? 0 })),
  ];

  return {
    caller: caller ?? "",
    total,
    today: dayMap.get(today)?.total ?? 0,
    byOutcome,
    days: [...dayMap.values()],
    callers: people.map((p) => p.caller),
  };
}
