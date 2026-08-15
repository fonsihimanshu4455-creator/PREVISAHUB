// ---------------------------------------------------------------------------
// The follow-up engine.
//
// A lead nobody has promised to ring again is a lead nobody rings. So every
// active lead carries an open follow-up row, and the CRM — not the executive's
// memory — decides when the next one falls due.
//
// The cadence below is the department's, expressed as days since the lead was
// created: call today, tomorrow, day 3, week 1, day 10, then nurture, then
// cold. `nextDueDate` picks the first step still ahead of the lead.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";
import { logActivity } from "./activity";

/** Days after creation at which the CRM wants the lead touched. */
export const FOLLOW_UP_SEQUENCE = [0, 1, 3, 6, 10, 15, 30];

/** Past this, nobody is buying today — the lead belongs in the old database. */
export const COLD_AFTER_DAYS = 30;

export type FollowUp = {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  owner: string;
  dueDate: string;
  dueTime: string;
  kind: string;
  note: string;
  status: "Open" | "Done" | "Missed" | "Superseded";
  createdAt: string;
};

const DAY = 24 * 60 * 60 * 1000;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + days * DAY)
    .toISOString()
    .slice(0, 10);
}

/**
 * The next date in the cadence for a lead created on `createdOn`, given that
 * today is `from`. Returns "" once the lead is past the sequence — at that
 * point it is cold, not overdue.
 */
export function nextDueDate(createdOn: string, from = today()): string {
  const elapsed = Math.round(
    (Date.parse(from + "T00:00:00Z") - Date.parse(createdOn + "T00:00:00Z")) / DAY
  );
  const step = FOLLOW_UP_SEQUENCE.find((d) => d > elapsed);
  if (step === undefined) return "";
  return addDays(createdOn, step);
}

function id(): string {
  return `FU-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Give the lead exactly one open follow-up, on `due`, so the queue can never
 * show two rows for the same lead.
 *
 * Whatever it replaces is only counted as MISSED if its date had already gone
 * by — replacing a future one is a re-plan, not a failure. Booking a
 * consultation for next week should not charge the executive with missing the
 * call they had pencilled in for tomorrow; missed follow-ups is a number
 * managers judge people on, so it has to mean what it says.
 */
export async function scheduleFollowUp(opts: {
  leadId: string;
  owner: string;
  due: string;
  time?: string;
  kind?: string;
  note?: string;
  actor: string;
}): Promise<void> {
  if (!sql || !opts.due) return;
  await ensureLeadSchema();
  const t = today();
  await sql`
    UPDATE lead_followups
    SET status = CASE WHEN due_date < ${t} THEN 'Missed' ELSE 'Superseded' END
    WHERE lead_id = ${opts.leadId} AND status = 'Open'
  `;
  await sql`
    INSERT INTO lead_followups (id, lead_id, owner, due_date, due_time, kind, note)
    VALUES (${id()}, ${opts.leadId}, ${opts.owner}, ${opts.due},
            ${opts.time ?? ""}, ${opts.kind ?? "Call"}, ${opts.note ?? ""})
  `;
  await logActivity(
    opts.leadId,
    "followup_created",
    `Follow-up set for ${opts.due}${opts.time ? ` at ${opts.time}` : ""}`,
    opts.actor,
    opts.note ?? ""
  );
}

/** Mark the lead's open follow-up done — called when a call is logged. */
export async function completeOpenFollowUp(
  leadId: string,
  actor: string
): Promise<void> {
  if (!sql) return;
  await ensureLeadSchema();
  const done = await sql<{ id: string }[]>`
    UPDATE lead_followups SET status = 'Done', completed_at = now()
    WHERE lead_id = ${leadId} AND status = 'Open'
    RETURNING id
  `;
  if (done.length) {
    await logActivity(leadId, "followup_done", "Follow-up completed", actor);
  }
}

export type Queue = "today" | "overdue" | "tomorrow" | "upcoming" | "missed";

/**
 * The five buckets the floor works from. Overdue is deliberately unbounded —
 * business rule 4: no overdue follow-up may be hidden.
 */
export async function followUpQueue(
  queue: Queue,
  owner?: string,
  limit = 200
): Promise<FollowUp[]> {
  if (!sql) return [];
  await ensureLeadSchema();
  const t = today();
  const tomorrow = addDays(t, 1);

  const scope = owner ? sql`lower(f.owner) = lower(${owner})` : sql`TRUE`;
  const when =
    queue === "today"
      ? sql`f.status = 'Open' AND f.due_date = ${t}`
      : queue === "overdue"
      ? sql`f.status = 'Open' AND f.due_date <> '' AND f.due_date < ${t}`
      : queue === "tomorrow"
      ? sql`f.status = 'Open' AND f.due_date = ${tomorrow}`
      : queue === "upcoming"
      ? sql`f.status = 'Open' AND f.due_date > ${tomorrow}`
      : sql`f.status = 'Missed'`;

  const rows = await sql<
    {
      id: string; lead_id: string; name: string; phone: string; owner: string;
      due_date: string; due_time: string; kind: string; note: string;
      status: string; created_at: Date;
    }[]
  >`
    SELECT f.id, f.lead_id, l.name, l.phone, f.owner, f.due_date, f.due_time,
           f.kind, f.note, f.status, f.created_at
    FROM lead_followups f JOIN leads l ON l.id = f.lead_id
    WHERE ${scope} AND ${when}
    ORDER BY f.due_date ASC, f.due_time ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    leadId: r.lead_id,
    leadName: r.name,
    phone: r.phone,
    owner: r.owner,
    dueDate: r.due_date,
    dueTime: r.due_time,
    kind: r.kind,
    note: r.note,
    status: r.status as FollowUp["status"],
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

/** Counts for the queue tabs, in one query rather than five. */
export async function followUpCounts(
  owner?: string
): Promise<Record<Queue, number>> {
  const empty: Record<Queue, number> = {
    today: 0, overdue: 0, tomorrow: 0, upcoming: 0, missed: 0,
  };
  if (!sql) return empty;
  await ensureLeadSchema();
  const t = today();
  const tomorrow = addDays(t, 1);
  const scope = owner ? sql`lower(owner) = lower(${owner})` : sql`TRUE`;
  const [r] = await sql<Record<Queue, string>[]>`
    SELECT
      COUNT(*) FILTER (WHERE status='Open' AND due_date = ${t})        AS today,
      COUNT(*) FILTER (WHERE status='Open' AND due_date <> '' AND due_date < ${t}) AS overdue,
      COUNT(*) FILTER (WHERE status='Open' AND due_date = ${tomorrow}) AS tomorrow,
      COUNT(*) FILTER (WHERE status='Open' AND due_date > ${tomorrow}) AS upcoming,
      COUNT(*) FILTER (WHERE status='Missed')                          AS missed
    FROM lead_followups WHERE ${scope}
  `;
  return {
    today: Number(r?.today ?? 0),
    overdue: Number(r?.overdue ?? 0),
    tomorrow: Number(r?.tomorrow ?? 0),
    upcoming: Number(r?.upcoming ?? 0),
    missed: Number(r?.missed ?? 0),
  };
}
