// ---------------------------------------------------------------------------
// Lead data access.
//
// This is the one door into the leads table. Scoring, the activity timeline
// and follow-up scheduling all happen here rather than in the API routes, so
// a lead cannot be changed by one screen in a way another screen would miss.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";
import { logActivity, logActivities } from "./activity";
import { nextDueDate, scheduleFollowUp, today } from "./followups";
import { rescore } from "./scoring";
import {
  ACTIVE_STATUSES, DEAD_STATUSES, EMPTY_LEAD, Lead, LeadStatus,
  Priority, QUALIFIED_STATUSES, REASON_REQUIRED, WON_STATUS,
} from "./types";

type Row = {
  id: string; created_at: Date; updated_at: Date; source: string; name: string;
  phone: string; whatsapp: string; email: string; city: string; residence: string;
  language: string; age: number | null; occupation: string; destination: string;
  visa_type: string; current_visa: string; previous_refusal: boolean;
  travel_history: string; education: string; work_experience: string;
  english_test: string; budget: string | null; expected_application: string;
  owner: string; score: number; status: string; priority: string;
  next_follow_up_date: string; next_follow_up_time: string;
  last_contact_date: string; last_outcome: string; lost_reason: string;
  notes: string; handover_student_id: string;
};

function toLead(r: Row): Lead {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    source: r.source as Lead["source"],
    name: r.name,
    phone: r.phone,
    whatsapp: r.whatsapp,
    email: r.email,
    city: r.city,
    residence: r.residence,
    language: r.language,
    age: r.age,
    occupation: r.occupation,
    destination: r.destination,
    visaType: r.visa_type as Lead["visaType"],
    currentVisaStatus: r.current_visa,
    previousRefusal: r.previous_refusal,
    travelHistory: r.travel_history,
    education: r.education,
    workExperience: r.work_experience,
    englishTest: r.english_test,
    budget: r.budget === null ? null : Number(r.budget),
    expectedApplication: r.expected_application,
    owner: r.owner,
    score: r.score,
    status: r.status as LeadStatus,
    priority: r.priority as Priority,
    nextFollowUpDate: r.next_follow_up_date,
    nextFollowUpTime: r.next_follow_up_time,
    lastContactDate: r.last_contact_date,
    lastOutcome: r.last_outcome,
    lostReason: r.lost_reason,
    notes: r.notes,
    handoverStudentId: r.handover_student_id,
  };
}

const COLUMNS = `id, created_at, updated_at, source, name, phone, whatsapp,
  email, city, residence, language, age, occupation, destination, visa_type,
  current_visa, previous_refusal, travel_history, education, work_experience,
  english_test, budget, expected_application, owner, score, status, priority,
  next_follow_up_date, next_follow_up_time, last_contact_date, last_outcome,
  lost_reason, notes, handover_student_id`;

function newId(): string {
  return `LD-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

// ---------------------------------- list -----------------------------------

export type LeadQuery = {
  /** Set for anyone without leads:all — they see only their own. */
  owner?: string;
  q?: string;
  status?: string;
  /** "open" | "qualified" | "dead" | "won" — groups of statuses. */
  bucket?: string;
  source?: string;
  destination?: string;
  visaType?: string;
  priority?: string;
  /** "today" | "overdue" | "uncontacted" */
  due?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function listLeads(
  opts: LeadQuery = {}
): Promise<{ leads: Lead[]; total: number }> {
  if (!sql) return { leads: [], total: 0 };
  await ensureLeadSchema();
  const {
    owner, q = "", status = "", bucket = "", source = "", destination = "",
    visaType = "", priority = "", due = "", from = "", to = "",
    limit = 100, offset = 0,
  } = opts;
  const t = today();
  const needle = q.trim();

  const where = sql`
    ${owner ? sql`lower(owner) = lower(${owner})` : sql`TRUE`}
    AND ${status ? sql`status = ${status}` : sql`TRUE`}
    AND ${
      bucket === "open"
        ? sql`status = ANY(${ACTIVE_STATUSES})`
        : bucket === "qualified"
        ? sql`status = ANY(${QUALIFIED_STATUSES})`
        : bucket === "dead"
        ? sql`status = ANY(${DEAD_STATUSES})`
        : bucket === "won"
        ? sql`status = ${WON_STATUS}`
        : sql`TRUE`
    }
    AND ${source ? sql`source = ${source}` : sql`TRUE`}
    AND ${destination ? sql`destination = ${destination}` : sql`TRUE`}
    AND ${visaType ? sql`visa_type = ${visaType}` : sql`TRUE`}
    AND ${priority ? sql`priority = ${priority}` : sql`TRUE`}
    AND ${
      due === "today"
        ? sql`next_follow_up_date = ${t}`
        : due === "overdue"
        ? sql`next_follow_up_date <> '' AND next_follow_up_date < ${t}`
        : due === "uncontacted"
        ? sql`last_contact_date = ''`
        : sql`TRUE`
    }
    AND ${from ? sql`created_at >= ${from}::date` : sql`TRUE`}
    AND ${to ? sql`created_at < (${to}::date + 1)` : sql`TRUE`}
    AND ${
      needle
        ? sql`(name ILIKE ${"%" + needle + "%"} OR phone ILIKE ${"%" + needle + "%"}
               OR id ILIKE ${"%" + needle + "%"} OR email ILIKE ${"%" + needle + "%"}
               OR whatsapp ILIKE ${"%" + needle + "%"})`
        : sql`TRUE`
    }
  `;

  const [rows, [count]] = await Promise.all([
    sql<Row[]>`
      SELECT ${sql.unsafe(COLUMNS)} FROM leads WHERE ${where}
      ORDER BY score DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql<{ n: string }[]>`SELECT COUNT(*) AS n FROM leads WHERE ${where}`,
  ]);
  return { leads: rows.map(toLead), total: Number(count?.n ?? 0) };
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!sql) return null;
  await ensureLeadSchema();
  const [row] = await sql<Row[]>`
    SELECT ${sql.unsafe(COLUMNS)} FROM leads WHERE id = ${id}
  `;
  return row ? toLead(row) : null;
}

/** Who owns this lead? Used to gate an executive's writes without a full read. */
export async function leadOwner(id: string): Promise<string | null> {
  if (!sql) return null;
  await ensureLeadSchema();
  const [row] = await sql<{ owner: string }[]>`SELECT owner FROM leads WHERE id = ${id}`;
  return row ? row.owner : null;
}

// --------------------------------- create ----------------------------------

export type NewLead = Partial<Omit<Lead, "id" | "createdAt" | "updatedAt">> & {
  name: string;
  phone: string;
};

/**
 * Create a lead and start the clock: it is scored, given an owner and left
 * with a follow-up due today (business rules 1 and 3, and day 0 of the
 * cadence). Returns null if the number is already on the board.
 */
export async function createLead(
  input: NewLead,
  actor: string
): Promise<{ lead: Lead } | { error: string }> {
  if (!sql) return { error: "No database connected." };
  await ensureLeadSchema();

  const digits = input.phone.replace(/[^0-9]/g, "");
  if (digits.length < 7) return { error: "Enter a valid phone number." };
  // The last 10 digits, so a country code on one entry and not the other does
  // not let the same person onto the board twice.
  const tail = digits.slice(-10);
  const [dupe] = await sql<{ id: string; owner: string; name: string }[]>`
    SELECT id, owner, name FROM leads
    WHERE right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ${tail}
  `;
  if (dupe) {
    return {
      error: `That number is already on the board as ${dupe.name} (${dupe.id})${
        dupe.owner ? `, with ${dupe.owner}` : ""
      }.`,
    };
  }

  const draft = { ...EMPTY_LEAD, ...input };
  const { score, priority } = rescore(draft);
  const id = newId();

  const [row] = await sql<Row[]>`
    INSERT INTO leads (
      id, source, name, phone, whatsapp, email, city, residence, language, age,
      occupation, destination, visa_type, current_visa, previous_refusal,
      travel_history, education, work_experience, english_test, budget,
      expected_application, owner, score, status, priority,
      next_follow_up_date, next_follow_up_time, notes
    ) VALUES (
      ${id}, ${draft.source}, ${draft.name.trim()}, ${draft.phone.trim()},
      ${draft.whatsapp || draft.phone.trim()}, ${draft.email}, ${draft.city},
      ${draft.residence},
      ${draft.language}, ${draft.age}, ${draft.occupation}, ${draft.destination},
      ${draft.visaType}, ${draft.currentVisaStatus}, ${draft.previousRefusal},
      ${draft.travelHistory}, ${draft.education}, ${draft.workExperience},
      ${draft.englishTest}, ${draft.budget}, ${draft.expectedApplication},
      ${draft.owner}, ${score}, ${draft.status}, ${priority},
      ${draft.nextFollowUpDate || today()}, ${draft.nextFollowUpTime}, ${draft.notes}
    )
    RETURNING ${sql.unsafe(COLUMNS)}
  `;

  const lead = toLead(row);
  await logActivities(id, actor, [
    { kind: "created", summary: `Lead created from ${lead.source}` },
    ...(lead.owner
      ? [{ kind: "assigned" as const, summary: `Assigned to ${lead.owner}` }]
      : []),
    { kind: "score", summary: `Scored ${score} — ${priority}` },
  ]);
  await scheduleFollowUp({
    leadId: id,
    owner: lead.owner,
    due: lead.nextFollowUpDate,
    time: lead.nextFollowUpTime,
    kind: "First call",
    note: "First call after lead creation",
    actor,
  });
  return { lead };
}

// --------------------------------- update ----------------------------------

const FIELD_COLUMN: Record<string, string> = {
  source: "source", name: "name", phone: "phone", whatsapp: "whatsapp",
  email: "email", city: "city", residence: "residence", language: "language", age: "age",
  occupation: "occupation", destination: "destination", visaType: "visa_type",
  currentVisaStatus: "current_visa", previousRefusal: "previous_refusal",
  travelHistory: "travel_history", education: "education",
  workExperience: "work_experience", englishTest: "english_test",
  budget: "budget", expectedApplication: "expected_application",
  owner: "owner", status: "status", priority: "priority",
  nextFollowUpDate: "next_follow_up_date", nextFollowUpTime: "next_follow_up_time",
  lastContactDate: "last_contact_date", lastOutcome: "last_outcome",
  lostReason: "lost_reason", notes: "notes",
  handoverStudentId: "handover_student_id",
};

/**
 * Update a lead. Rescores it, records what changed on the timeline, and keeps
 * the follow-up queue honest:
 *
 *   - a status that closes the lead clears its open follow-up;
 *   - a status that leaves it active but with no date gets one from the
 *     cadence, so no active lead is ever left un-chased (business rule 3);
 *   - Lost / Not Interested / Not Eligible need a reason (rule 7).
 */
export async function updateLead(
  id: string,
  patch: Partial<Lead>,
  actor: string,
  /**
   * `schedule: false` updates the date column without creating a follow-up
   * row. Call logging passes this: it writes its own follow-up carrying the
   * next action, and scheduling twice would mark the first one missed and
   * inflate the missed-follow-ups figure managers watch.
   */
  opts: { schedule?: boolean } = {}
): Promise<{ lead: Lead } | { error: string }> {
  const schedule = opts.schedule !== false;
  if (!sql) return { error: "No database connected." };
  await ensureLeadSchema();

  const before = await getLead(id);
  if (!before) return { error: "Lead not found." };

  const merged: Lead = { ...before, ...patch };

  if (
    REASON_REQUIRED.includes(merged.status) &&
    !merged.lostReason.trim()
  ) {
    return { error: `Pick a reason before marking this lead ${merged.status}.` };
  }

  const { score, priority } = rescore(merged);
  // Priority is derived from the score unless someone set it by hand in the
  // same edit — a manager flagging a lead Hot should stick.
  const finalPriority = patch.priority ?? priority;

  const sets: Record<string, unknown> = {};
  for (const [field, column] of Object.entries(FIELD_COLUMN)) {
    if (field in patch) sets[column] = (patch as Record<string, unknown>)[field];
  }
  sets.score = score;
  sets.priority = finalPriority;
  sets.updated_at = new Date();

  const [row] = await sql<Row[]>`
    UPDATE leads SET ${sql(sets)} WHERE id = ${id}
    RETURNING ${sql.unsafe(COLUMNS)}
  `;
  const lead = toLead(row);

  // ---- timeline -----------------------------------------------------------
  const entries: Parameters<typeof logActivities>[2] = [];
  if (patch.status && patch.status !== before.status) {
    entries.push({
      kind: patch.status === WON_STATUS ? "converted" : "status",
      summary: `${before.status} → ${patch.status}`,
      detail: merged.lostReason ? `Reason: ${merged.lostReason}` : "",
    });
  }
  if (patch.owner !== undefined && patch.owner !== before.owner) {
    entries.push({
      kind: "assigned",
      summary: before.owner
        ? `Reassigned from ${before.owner} to ${patch.owner}`
        : `Assigned to ${patch.owner}`,
    });
  }
  if (score !== before.score) {
    entries.push({
      kind: "score",
      summary: `Score ${before.score} → ${score} (${finalPriority})`,
    });
  }
  if (patch.notes !== undefined && patch.notes !== before.notes) {
    entries.push({ kind: "note", summary: "Notes updated", detail: patch.notes });
  }
  await logActivities(id, actor, entries);

  // ---- follow-up queue ----------------------------------------------------
  // A lead that is won or closed is nobody's chase job any more, so it comes
  // out of the queue either way — a converted client left sitting in "due
  // today" is exactly the noise that makes people stop trusting the queue.
  const settled = DEAD_STATUSES.includes(lead.status) || lead.status === WON_STATUS;
  if (settled) {
    // Closing a lead cancels what was pencilled in; that is a decision, not a
    // missed call, so it only counts as missed if the date had already passed.
    const t = today();
    await sql`
      UPDATE lead_followups
      SET status = CASE WHEN due_date < ${t} THEN 'Missed' ELSE 'Superseded' END
      WHERE lead_id = ${id} AND status = 'Open'
    `;
    if (lead.nextFollowUpDate) {
      await sql`UPDATE leads SET next_follow_up_date = '' WHERE id = ${id}`;
      lead.nextFollowUpDate = "";
    }
  } else if (schedule && patch.nextFollowUpDate) {
    await scheduleFollowUp({
      leadId: id,
      owner: lead.owner,
      due: patch.nextFollowUpDate,
      time: lead.nextFollowUpTime,
      actor,
    });
  } else if (schedule && !lead.nextFollowUpDate && lead.status !== WON_STATUS) {
    const due = nextDueDate(lead.createdAt.slice(0, 10));
    if (due) {
      await sql`UPDATE leads SET next_follow_up_date = ${due} WHERE id = ${id}`;
      lead.nextFollowUpDate = due;
      await scheduleFollowUp({ leadId: id, owner: lead.owner, due, actor });
    }
  }

  return { lead };
}

/**
 * Reassign a lead. Separate from updateLead because ownership is the one field
 * an executive may never change on their own (business rule: once assigned,
 * only a manager moves it).
 */
export async function assignLead(
  id: string,
  owner: string,
  actor: string
): Promise<{ lead: Lead } | { error: string }> {
  const res = await updateLead(id, { owner }, actor);
  if ("lead" in res && sql) {
    await sql`
      UPDATE lead_followups SET owner = ${owner}
      WHERE lead_id = ${id} AND status = 'Open'
    `;
  }
  return res;
}

export async function deleteLead(id: string, actor: string): Promise<boolean> {
  if (!sql) return false;
  await ensureLeadSchema();
  await logActivity(id, "status", "Lead deleted", actor);
  const rows = await sql<{ id: string }[]>`
    DELETE FROM leads WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Sweep leads nobody has touched inside the cadence into the cold pile, so the
 * old-database module has something to work with and the live board stays
 * honest. Returns how many moved.
 */
export async function coolOffStale(actor = "system"): Promise<number> {
  if (!sql) return 0;
  await ensureLeadSchema();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const rows = await sql<{ id: string }[]>`
    UPDATE leads SET status = 'Cold Lead', next_follow_up_date = '', updated_at = now()
    WHERE status = ANY(${ACTIVE_STATUSES})
      AND created_at < ${cutoff}::date
      AND (last_contact_date = '' OR last_contact_date < ${cutoff})
    RETURNING id
  `;
  for (const r of rows) {
    await logActivity(r.id, "status", "Moved to Cold — 30 days with no progress", actor);
  }
  return rows.length;
}

/**
 * The four numbers on the calling screen's tabs, in one query.
 *
 * The screen used to fetch the whole list four times over — once per tab —
 * purely to count them, which is four requests and eight queries before a
 * caller sees a single name.
 */
export async function callQueueCounts(
  owner?: string
): Promise<{ overdue: number; today: number; uncontacted: number; all: number; cold: number }> {
  const empty = { overdue: 0, today: 0, uncontacted: 0, all: 0, cold: 0 };
  if (!sql) return empty;
  await ensureLeadSchema();
  const t = today();
  const scope = owner ? sql`lower(owner) = lower(${owner})` : sql`TRUE`;
  const [r] = await sql<Record<string, string>[]>`
    SELECT
      COUNT(*) FILTER (WHERE open AND next_follow_up_date <> '' AND next_follow_up_date < ${t}) AS overdue,
      COUNT(*) FILTER (WHERE open AND next_follow_up_date = ${t})   AS today,
      COUNT(*) FILTER (WHERE open AND last_contact_date = '')       AS uncontacted,
      COUNT(*) FILTER (WHERE open)                                  AS all,
      COUNT(*) FILTER (WHERE status = 'Cold Lead')                  AS cold
    FROM (
      SELECT *, status = ANY(${ACTIVE_STATUSES}) AS open FROM leads WHERE ${scope}
    ) x
  `;
  return {
    overdue: Number(r?.overdue ?? 0),
    today: Number(r?.today ?? 0),
    uncontacted: Number(r?.uncontacted ?? 0),
    all: Number(r?.all ?? 0),
    cold: Number(r?.cold ?? 0),
  };
}
