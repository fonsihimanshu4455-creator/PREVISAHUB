// ---------------------------------------------------------------------------
// Calling panel.
//
// The admin assigns a student to a telecaller; that telecaller sees only the
// numbers assigned to them. Every attempt is logged, so a lead's history is
// visible rather than living in someone's notebook — and the last outcome
// drives what the caller should do next.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";
import { sql, ensureSchema } from "./db";

export type CallOutcome =
  | "Connected"
  | "No answer"
  | "Busy"
  | "Switched off"
  | "Wrong number"
  | "Interested"
  | "Not interested"
  | "Callback";

export const CALL_OUTCOMES: CallOutcome[] = [
  "Connected",
  "Interested",
  "Callback",
  "No answer",
  "Busy",
  "Switched off",
  "Not interested",
  "Wrong number",
];

/** Outcomes that mean this lead is finished — no point calling again. */
export const CLOSED_OUTCOMES: CallOutcome[] = ["Not interested", "Wrong number"];

export type CallLog = {
  id: string;
  studentId: string;
  studentName: string;
  phone: string;
  telecaller: string;
  outcome: CallOutcome;
  note: string;
  callbackOn: string;
  calledAt: string;
};

/** A number on someone's calling list, with the state of the last attempt. */
export type CallTarget = {
  studentId: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  stage: string;
  telecaller: string;
  attempts: number;
  lastOutcome: CallOutcome | "";
  lastCalledAt: string;
  callbackOn: string;
};

let callingReady: Promise<void> | null = null;

export function ensureCallingSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!callingReady) {
    callingReady = createCallingSchema().catch((e) => {
      callingReady = null;
      throw e;
    });
  }
  return callingReady;
}

async function createCallingSchema(): Promise<void> {
  if (!sql) return;
  await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS telecaller text NOT NULL DEFAULT ''`;
  await sql`
    CREATE INDEX IF NOT EXISTS students_telecaller_idx
    ON students (lower(telecaller))
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS call_logs (
      id          text PRIMARY KEY,
      student_id  text NOT NULL,
      telecaller  text NOT NULL,
      outcome     text NOT NULL,
      note        text,
      callback_on text,
      called_at   timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS call_logs_student_idx ON call_logs (student_id)`;
}

/**
 * The calling list. Pass `telecaller` for a caller's own numbers; the admin
 * calls it without one to see every assigned lead.
 */
export async function callList(telecaller?: string): Promise<CallTarget[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureCallingSchema();
  const scoped = telecaller ?? null;
  const rows = await sql<{
    id: string; name: string; phone: string; city: string | null;
    country: string; stage: string; telecaller: string;
    attempts: string; last_outcome: string | null;
    last_called_at: string | Date | null; callback_on: string | null;
  }[]>`
    WITH last_call AS (
      SELECT DISTINCT ON (student_id)
        student_id, outcome, called_at, callback_on
      FROM call_logs
      ORDER BY student_id, called_at DESC
    ),
    counts AS (
      SELECT student_id, COUNT(*) AS attempts FROM call_logs GROUP BY student_id
    )
    SELECT s.id, s.name, s.phone, s.city, s.country, s.stage, s.telecaller,
           COALESCE(c.attempts, 0) AS attempts,
           l.outcome  AS last_outcome,
           l.called_at AS last_called_at,
           l.callback_on
    FROM students s
    LEFT JOIN last_call l ON l.student_id = s.id
    LEFT JOIN counts   c ON c.student_id = s.id
    WHERE s.telecaller <> ''
      AND ${scoped === null ? sql`TRUE` : sql`lower(s.telecaller) = lower(${scoped})`}
    ORDER BY
      -- Callbacks that are due come first, then never-tried numbers.
      (l.callback_on IS NOT NULL AND l.callback_on <= to_char(now(), 'YYYY-MM-DD')) DESC,
      (l.outcome IS NULL) DESC,
      l.called_at ASC NULLS FIRST
  `;
  return rows.map((r) => ({
    studentId: r.id,
    name: r.name,
    phone: r.phone,
    city: r.city ?? "",
    country: r.country,
    stage: r.stage,
    telecaller: r.telecaller,
    attempts: Number(r.attempts),
    lastOutcome: (r.last_outcome ?? "") as CallOutcome | "",
    lastCalledAt: r.last_called_at ? String(r.last_called_at) : "",
    callbackOn: r.callback_on ?? "",
  }));
}

export async function logCall(input: {
  studentId: string;
  telecaller: string;
  outcome: CallOutcome;
  note?: string;
  callbackOn?: string;
}): Promise<CallLog | null> {
  if (!sql) return null;
  await ensureSchema();
  await ensureCallingSchema();
  const id = `CALL-${randomBytes(5).toString("hex")}`;
  await sql`
    INSERT INTO call_logs (id, student_id, telecaller, outcome, note, callback_on)
    VALUES (${id}, ${input.studentId}, ${input.telecaller}, ${input.outcome},
            ${input.note ?? ""}, ${input.callbackOn || null})
  `;
  const [row] = await sql<{
    id: string; student_id: string; telecaller: string; outcome: string;
    note: string | null; callback_on: string | null; called_at: string | Date;
    name: string | null; phone: string | null;
  }[]>`
    SELECT c.*, s.name, s.phone FROM call_logs c
    LEFT JOIN students s ON s.id = c.student_id WHERE c.id = ${id}
  `;
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.name ?? "",
    phone: row.phone ?? "",
    telecaller: row.telecaller,
    outcome: row.outcome as CallOutcome,
    note: row.note ?? "",
    callbackOn: row.callback_on ?? "",
    calledAt: String(row.called_at),
  };
}

/** Recent attempts, for the admin's activity view or one lead's history. */
export async function recentCalls(opts: {
  telecaller?: string;
  studentId?: string;
  limit?: number;
}): Promise<CallLog[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureCallingSchema();
  const { telecaller = null, studentId = null, limit = 100 } = opts;
  const rows = await sql<{
    id: string; student_id: string; telecaller: string; outcome: string;
    note: string | null; callback_on: string | null; called_at: string | Date;
    name: string | null; phone: string | null;
  }[]>`
    SELECT c.*, s.name, s.phone FROM call_logs c
    LEFT JOIN students s ON s.id = c.student_id
    WHERE ${telecaller === null ? sql`TRUE` : sql`lower(c.telecaller) = lower(${telecaller})`}
      AND ${studentId === null ? sql`TRUE` : sql`c.student_id = ${studentId}`}
    ORDER BY c.called_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: r.name ?? "",
    phone: r.phone ?? "",
    telecaller: r.telecaller,
    outcome: r.outcome as CallOutcome,
    note: r.note ?? "",
    callbackOn: r.callback_on ?? "",
    calledAt: String(r.called_at),
  }));
}

/** Assign (or clear) the telecaller on a set of students. Admin only. */
export async function assignTelecaller(
  studentIds: string[],
  telecaller: string
): Promise<number> {
  if (!sql || studentIds.length === 0) return 0;
  await ensureSchema();
  await ensureCallingSchema();
  const rows = await sql`
    UPDATE students SET telecaller = ${telecaller}
    WHERE id = ANY(${studentIds})
    RETURNING id
  `;
  return rows.length;
}

/** Who is assigned to call this student? Used to gate a telecaller's writes. */
export async function studentTelecaller(id: string): Promise<string | null> {
  if (!sql) return null;
  await ensureCallingSchema();
  const rows = await sql<{ telecaller: string }[]>`
    SELECT telecaller FROM students WHERE id = ${id}
  `;
  return rows[0]?.telecaller ?? null;
}

/** Per-caller tallies for the admin's overview. */
export type CallerStats = {
  telecaller: string;
  assigned: number;
  called: number;
  interested: number;
  pending: number;
};

export async function callerStats(): Promise<CallerStats[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureCallingSchema();
  const rows = await sql<{
    telecaller: string; assigned: string; called: string; interested: string;
  }[]>`
    WITH tried AS (
      SELECT DISTINCT student_id FROM call_logs
    ),
    keen AS (
      SELECT DISTINCT student_id FROM call_logs WHERE outcome = 'Interested'
    )
    SELECT s.telecaller,
           COUNT(*)                                          AS assigned,
           COUNT(*) FILTER (WHERE t.student_id IS NOT NULL)   AS called,
           COUNT(*) FILTER (WHERE k.student_id IS NOT NULL)   AS interested
    FROM students s
    LEFT JOIN tried t ON t.student_id = s.id
    LEFT JOIN keen  k ON k.student_id = s.id
    WHERE s.telecaller <> ''
    GROUP BY s.telecaller
    ORDER BY assigned DESC
  `;
  return rows.map((r) => {
    const assigned = Number(r.assigned);
    const called = Number(r.called);
    return {
      telecaller: r.telecaller,
      assigned,
      called,
      interested: Number(r.interested),
      pending: assigned - called,
    };
  });
}
