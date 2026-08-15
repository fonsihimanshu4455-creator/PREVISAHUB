// ---------------------------------------------------------------------------
// Coaching records: practice tests and class attendance.
//
// Tests are kept per attempt rather than as a single score on the student, so
// a counsellor can see the trend — a weekly Speaking test at 58 followed by
// one at 66 is the useful fact, not just the latest number. A record can cover
// the whole exam or one section, which is how sessional tests are run.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";
import { ensureSchema, schemaGuard, sql } from "./db";

export type ExamKind = "PTE" | "IELTS";
export const EXAM_KINDS: ExamKind[] = ["PTE", "IELTS"];

export type TestKind = "Weekly" | "Sessional" | "Mock" | "Practice";
export const TEST_KINDS: TestKind[] = ["Weekly", "Sessional", "Mock", "Practice"];

export type TestSection =
  | "Overall"
  | "Speaking"
  | "Writing"
  | "Reading"
  | "Listening";
export const TEST_SECTIONS: TestSection[] = [
  "Overall",
  "Speaking",
  "Writing",
  "Reading",
  "Listening",
];

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave";
export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "Present",
  "Absent",
  "Late",
  "Leave",
];

export type TestRecord = {
  id: string;
  studentId: string;
  studentName: string;
  counsellor: string;
  exam: ExamKind;
  kind: TestKind;
  section: TestSection;
  score: number;
  maxScore: number;
  takenOn: string;
  note: string;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  counsellor: string;
  date: string;
  status: AttendanceStatus;
  note: string;
};

/** Default top of scale: PTE sections are out of 90, IELTS bands out of 9. */
export function defaultMax(exam: ExamKind): number {
  return exam === "PTE" ? 90 : 9;
}

// --------------------------- schema ----------------------------------------

// One catalog check on a cold instance rather than the DDL — see schemaGuard.
export const ensureAcademicsSchema = schemaGuard({ tables: ["test_records", "attendance"] }, () => createAcademicsSchema());

async function createAcademicsSchema(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS test_records (
      id         text PRIMARY KEY,
      student_id text NOT NULL,
      exam       text NOT NULL DEFAULT 'PTE',
      kind       text NOT NULL DEFAULT 'Weekly',
      section    text NOT NULL DEFAULT 'Overall',
      score      numeric(5,2) NOT NULL,
      max_score  numeric(5,2) NOT NULL DEFAULT 90,
      taken_on   text NOT NULL,
      note       text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS test_records_student_idx ON test_records (student_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id         text PRIMARY KEY,
      student_id text NOT NULL,
      date       text NOT NULL,
      status     text NOT NULL DEFAULT 'Present',
      note       text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  // One record per student per day — marking twice updates rather than doubles.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_date_idx
    ON attendance (student_id, date)
  `;
}

// --------------------------- tests -----------------------------------------

type TestRow = {
  id: string; student_id: string; student_name: string | null;
  counsellor: string | null; exam: string; kind: string; section: string;
  score: string; max_score: string; taken_on: string; note: string | null;
};

function toTest(r: TestRow): TestRecord {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name ?? "",
    counsellor: r.counsellor ?? "",
    exam: r.exam as ExamKind,
    kind: r.kind as TestKind,
    section: r.section as TestSection,
    score: Number(r.score),
    maxScore: Number(r.max_score),
    takenOn: r.taken_on,
    note: r.note ?? "",
  };
}

export async function listTests(opts: {
  counsellor?: string;
  studentId?: string;
  limit?: number;
}): Promise<TestRecord[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureAcademicsSchema();
  const { counsellor = null, studentId = null, limit = 100 } = opts;
  const rows = await sql<TestRow[]>`
    SELECT t.*, s.name AS student_name, s.counsellor
    FROM test_records t LEFT JOIN students s ON s.id = t.student_id
    WHERE ${counsellor === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${counsellor})`}
      AND ${studentId === null ? sql`TRUE` : sql`t.student_id = ${studentId}`}
    ORDER BY t.taken_on DESC, t.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(toTest);
}

export async function addTest(input: {
  studentId: string;
  exam: ExamKind;
  kind: TestKind;
  section: TestSection;
  score: number;
  maxScore: number;
  takenOn: string;
  note?: string;
}): Promise<TestRecord | null> {
  if (!sql) return null;
  await ensureSchema();
  await ensureAcademicsSchema();
  const id = `TST-${randomBytes(4).toString("hex")}`;
  await sql`
    INSERT INTO test_records (id, student_id, exam, kind, section, score, max_score, taken_on, note)
    VALUES (${id}, ${input.studentId}, ${input.exam}, ${input.kind},
            ${input.section}, ${input.score}, ${input.maxScore},
            ${input.takenOn}, ${input.note ?? ""})
  `;
  const [row] = await sql<TestRow[]>`
    SELECT t.*, s.name AS student_name, s.counsellor
    FROM test_records t LEFT JOIN students s ON s.id = t.student_id
    WHERE t.id = ${id}
  `;
  return row ? toTest(row) : null;
}

export async function deleteTest(id: string): Promise<boolean> {
  if (!sql) return false;
  await ensureAcademicsSchema();
  const rows = await sql`DELETE FROM test_records WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** The counsellor who owns the student this record belongs to. */
export async function testCounsellor(id: string): Promise<string | null> {
  if (!sql) return null;
  await ensureAcademicsSchema();
  const rows = await sql<{ counsellor: string | null }[]>`
    SELECT s.counsellor FROM test_records t
    LEFT JOIN students s ON s.id = t.student_id WHERE t.id = ${id}
  `;
  return rows[0]?.counsellor ?? null;
}

/** Latest score per student per section — the "where are they now" view. */
export type SectionProgress = {
  studentId: string;
  studentName: string;
  section: TestSection;
  latest: number;
  maxScore: number;
  attempts: number;
  best: number;
};

export async function sectionProgress(counsellor?: string): Promise<SectionProgress[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureAcademicsSchema();
  const scoped = counsellor ?? null;
  const rows = await sql<{
    student_id: string; student_name: string; section: string;
    latest: string; max_score: string; attempts: string; best: string;
  }[]>`
    SELECT DISTINCT ON (t.student_id, t.section)
      t.student_id,
      s.name AS student_name,
      t.section,
      t.score AS latest,
      t.max_score,
      COUNT(*)  OVER (PARTITION BY t.student_id, t.section) AS attempts,
      MAX(t.score) OVER (PARTITION BY t.student_id, t.section) AS best
    FROM test_records t LEFT JOIN students s ON s.id = t.student_id
    WHERE ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
    ORDER BY t.student_id, t.section, t.taken_on DESC, t.created_at DESC
  `;
  return rows.map((r) => ({
    studentId: r.student_id,
    studentName: r.student_name ?? "",
    section: r.section as TestSection,
    latest: Number(r.latest),
    maxScore: Number(r.max_score),
    attempts: Number(r.attempts),
    best: Number(r.best),
  }));
}

// --------------------------- attendance ------------------------------------

type AttendanceRow = {
  id: string; student_id: string; student_name: string | null;
  counsellor: string | null; date: string; status: string; note: string | null;
};

function toAttendance(r: AttendanceRow): AttendanceRecord {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name ?? "",
    counsellor: r.counsellor ?? "",
    date: r.date,
    status: r.status as AttendanceStatus,
    note: r.note ?? "",
  };
}

/** Everyone marked on a given day. */
export async function attendanceForDate(
  date: string,
  counsellor?: string
): Promise<AttendanceRecord[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureAcademicsSchema();
  const scoped = counsellor ?? null;
  const rows = await sql<AttendanceRow[]>`
    SELECT a.*, s.name AS student_name, s.counsellor
    FROM attendance a LEFT JOIN students s ON s.id = a.student_id
    WHERE a.date = ${date}
      AND ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
  `;
  return rows.map(toAttendance);
}

/** Mark (or re-mark) one student for one day. */
export async function markAttendance(input: {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}): Promise<AttendanceRecord | null> {
  if (!sql) return null;
  await ensureSchema();
  await ensureAcademicsSchema();
  const id = `ATT-${randomBytes(4).toString("hex")}`;
  await sql`
    INSERT INTO attendance (id, student_id, date, status, note)
    VALUES (${id}, ${input.studentId}, ${input.date}, ${input.status}, ${input.note ?? ""})
    ON CONFLICT (student_id, date)
    DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note
  `;
  const [row] = await sql<AttendanceRow[]>`
    SELECT a.*, s.name AS student_name, s.counsellor
    FROM attendance a LEFT JOIN students s ON s.id = a.student_id
    WHERE a.student_id = ${input.studentId} AND a.date = ${input.date}
  `;
  return row ? toAttendance(row) : null;
}

/** Attendance rate per student, over every day they were marked. */
export type AttendanceSummary = {
  studentId: string;
  studentName: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  percent: number;
};

export async function attendanceSummary(
  counsellor?: string
): Promise<AttendanceSummary[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureAcademicsSchema();
  const scoped = counsellor ?? null;
  const rows = await sql<{
    student_id: string; student_name: string;
    present: string; absent: string; late: string; leave_count: string; total: string;
  }[]>`
    SELECT a.student_id,
           s.name AS student_name,
           COUNT(*) FILTER (WHERE a.status = 'Present') AS present,
           COUNT(*) FILTER (WHERE a.status = 'Absent')  AS absent,
           COUNT(*) FILTER (WHERE a.status = 'Late')    AS late,
           COUNT(*) FILTER (WHERE a.status = 'Leave')   AS leave_count,
           COUNT(*)                                     AS total
    FROM attendance a LEFT JOIN students s ON s.id = a.student_id
    WHERE ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
    GROUP BY a.student_id, s.name
    ORDER BY s.name
  `;
  return rows.map((r) => {
    const present = Number(r.present);
    const late = Number(r.late);
    const total = Number(r.total);
    return {
      studentId: r.student_id,
      studentName: r.student_name ?? "",
      present,
      absent: Number(r.absent),
      late,
      leave: Number(r.leave_count),
      total,
      // Late still counts as attended — they showed up.
      percent: total ? Math.round(((present + late) / total) * 100) : 0,
    };
  });
}
