// ---------------------------------------------------------------------------
// Pre Visa Hub — database layer (Postgres)
//
// Works with ANY Postgres provider via a single DATABASE_URL env var:
//   • Supabase        (recommended free tier)
//   • Neon
//   • Vercel Postgres
//   • Railway / Render / self-hosted
//
// If DATABASE_URL is NOT set, the whole app gracefully falls back to the
// in-memory demo seed (read-only) so the page never crashes before setup.
// ---------------------------------------------------------------------------

import postgres from "postgres";
import {
  SEED_STUDENTS,
  SEED_TASKS,
  Student,
  Task,
} from "./crm-data";

const raw = process.env.DATABASE_URL;

/**
 * Normalise whatever connection string the provider hands out.
 *
 * Supabase/Prisma docs tell people to append `?pgbouncer=true`, but that is a
 * pooler hint, not a Postgres setting — postgres.js forwards unknown query
 * params to the server, which then rejects the connection with
 * `unrecognized configuration parameter "pgbouncer"`. So we read those hints,
 * then strip them off the URL we actually connect with.
 */
function parseDbUrl(input: string | undefined) {
  if (!input) return null;
  let pooled = false;
  let clean = input;
  try {
    const u = new URL(input);
    // Pooled = Supabase Supavisor / PgBouncer transaction mode.
    pooled =
      u.searchParams.get("pgbouncer") === "true" ||
      u.hostname.includes("pooler.") ||
      u.port === "6543";
    for (const key of ["pgbouncer", "prepared_statements", "connection_limit"]) {
      u.searchParams.delete(key);
    }
    clean = u.toString();
  } catch {
    // Not a parseable URL — hand it to postgres.js as-is and let it complain.
    pooled = /pooler\.|:6543|pgbouncer=true/.test(input);
  }
  const local = /localhost|127\.0\.0\.1/.test(clean);
  const noSsl = local || clean.includes("sslmode=disable");
  return { clean, pooled, noSsl };
}

const cfg = parseDbUrl(raw);

// A single connection per instance keeps us friendly to serverless (Vercel),
// where many short-lived instances each open their own.
//
// `prepare: false` is required on a transaction-mode pooler: statements
// prepared on one pooled backend are not visible on the next, which surfaces
// as "prepared statement ... already exists" under load.
export const sql = cfg
  ? postgres(cfg.clean, {
      max: 3,
      idle_timeout: 20,
      prepare: !cfg.pooled,
      ssl: cfg.noSsl ? false : "require",
    })
  : null;

export const dbEnabled = !!sql;

/**
 * Describes the configured connection for the diagnostics endpoint.
 * Deliberately returns no password — only whether one is present and whether
 * it still looks like the copied placeholder.
 */
export function describeConnection() {
  if (!raw) {
    return {
      configured: false,
      parsed: false,
      host: "",
      port: "",
      database: "",
      pooled: false,
      hasPassword: false,
      passwordLooksLikePlaceholder: false,
    };
  }
  try {
    const u = new URL(raw);
    const pw = decodeURIComponent(u.password || "");
    return {
      configured: true,
      parsed: true,
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, "") || "postgres",
      pooled: cfg?.pooled ?? false,
      hasPassword: pw.length > 0,
      passwordLooksLikePlaceholder:
        /your[-_]?password|\[|\]|^password$/i.test(pw),
    };
  } catch {
    return {
      configured: true,
      parsed: false,
      host: "",
      port: "",
      database: "",
      pooled: cfg?.pooled ?? false,
      hasPassword: false,
      passwordLooksLikePlaceholder: false,
    };
  }
}

// --------------------------- schema + seed ---------------------------------

// Schema setup is idempotent but not free: each CREATE/ALTER is a network
// round-trip to the database. Running it per request added ~20 hops to every
// page load, so it is memoised — one run per server instance. A failure clears
// the cache so the next request retries rather than assuming success.
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = createSchema().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

async function createSchema(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id            text PRIMARY KEY,
      name          text NOT NULL,
      phone         text NOT NULL,
      email         text,
      city          text,
      country       text NOT NULL,
      intake        text,
      counsellor    text,
      stage         text NOT NULL,
      test_type     text NOT NULL,
      score         real,
      target_score  real NOT NULL DEFAULT 6.0,
      last_updated  text,
      next_follow_up text,
      notes         text,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS students_counsellor_idx
    ON students (lower(counsellor))
  `;
  // Every student write touches this column, so it belongs in the base schema
  // rather than only where the calling panel sets it up.
  await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS telecaller text NOT NULL DEFAULT ''`;
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id           text PRIMARY KEY,
      title        text NOT NULL,
      student_name text,
      due          text,
      priority     text,
      type         text,
      done         boolean NOT NULL DEFAULT false,
      created_at   timestamptz NOT NULL DEFAULT now()
    )
  `;
}

/** Insert the demo rows only if the tables are empty. Idempotent. */
export async function seedIfEmpty(): Promise<{ seeded: boolean }> {
  if (!sql) return { seeded: false };
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM students
  `;
  if (count > 0) return { seeded: false };

  for (const s of SEED_STUDENTS) {
    await sql`
      INSERT INTO students (id, name, phone, email, city, country, intake,
        counsellor, stage, test_type, score, target_score, last_updated,
        next_follow_up, notes)
      VALUES (${s.id}, ${s.name}, ${s.phone}, ${s.email}, ${s.city},
        ${s.country}, ${s.intake}, ${s.counsellor}, ${s.stage}, ${s.testType},
        ${s.score}, ${s.targetScore}, ${s.lastUpdated}, ${s.nextFollowUp},
        ${s.notes})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  for (const t of SEED_TASKS) {
    await sql`
      INSERT INTO tasks (id, title, student_name, due, priority, type, done)
      VALUES (${t.id}, ${t.title}, ${t.studentName}, ${t.due}, ${t.priority},
        ${t.type}, ${t.done})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  return { seeded: true };
}

/** Run schema + seed together — used by the /api/seed setup endpoint. */
export async function initDb() {
  await ensureSchema();
  return seedIfEmpty();
}

// --------------------------- row mapping -----------------------------------
// Postgres uses snake_case columns; the client expects camelCase Student/Task.

type StudentRow = {
  id: string; name: string; phone: string; email: string | null;
  city: string | null; country: string; intake: string | null;
  counsellor: string | null; telecaller: string | null; stage: string; test_type: string;
  score: number | null; target_score: number; last_updated: string | null;
  next_follow_up: string | null; notes: string | null;
};

function toStudent(r: StudentRow): Student {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? "",
    city: r.city ?? "",
    country: r.country as Student["country"],
    intake: r.intake ?? "",
    counsellor: r.counsellor ?? "",
    telecaller: r.telecaller ?? "",
    stage: r.stage as Student["stage"],
    testType: r.test_type as Student["testType"],
    score: r.score,
    targetScore: r.target_score,
    lastUpdated: r.last_updated ?? "",
    nextFollowUp: r.next_follow_up ?? "",
    notes: r.notes ?? "",
  };
}

type TaskRow = {
  id: string; title: string; student_name: string | null; due: string | null;
  priority: string; type: string; done: boolean;
};

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    studentName: r.student_name ?? "",
    due: r.due ?? "",
    priority: r.priority as Task["priority"],
    type: r.type as Task["type"],
    done: r.done,
  };
}

// --------------------------- queries ---------------------------------------

/**
 * List students. Pass `counsellor` to scope the result to one person's
 * caseload — staff sessions use this so they only ever see their own
 * students; the admin calls it without a filter and sees everyone.
 */
export type StudentQuery = {
  counsellor?: string;
  q?: string;
  stage?: string;
  country?: string;
  /** "today" narrows to students whose follow-up is due. */
  due?: string;
  limit?: number;
};

/**
 * Search and filter run in SQL rather than shipping every row for the browser
 * to sift — the full list was a 200 KB download that only grew. `limit` caps
 * a page; `total` tells the UI how much matched.
 */
export async function listStudents(
  arg?: string | StudentQuery
): Promise<{ students: Student[]; total: number }> {
  const opts: StudentQuery = typeof arg === "string" ? { counsellor: arg } : arg ?? {};
  const { counsellor, q = "", stage = "", country = "", due = "", limit = 200 } = opts;
  const today = new Date().toISOString().slice(0, 10);

  if (!sql) {
    let list = counsellor
      ? SEED_STUDENTS.filter(
          (s) => s.counsellor.toLowerCase() === counsellor.toLowerCase()
        )
      : SEED_STUDENTS;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((s) =>
        [s.name, s.id, s.city, s.phone].some((v) => v.toLowerCase().includes(needle))
      );
    }
    if (stage) list = list.filter((s) => s.stage === stage);
    if (country) list = list.filter((s) => s.country === country);
    if (due === "today") list = list.filter((s) => s.nextFollowUp && s.nextFollowUp <= today);
    return { students: list.slice(0, limit), total: list.length };
  }

  await ensureSchema();
  const needle = q.trim();
  const where = sql`
    ${counsellor ? sql`lower(counsellor) = lower(${counsellor})` : sql`TRUE`}
    AND ${stage ? sql`stage = ${stage}` : sql`TRUE`}
    AND ${country ? sql`country = ${country}` : sql`TRUE`}
    AND ${
      due === "today"
        ? sql`next_follow_up <> '' AND next_follow_up <= ${today}`
        : sql`TRUE`
    }
    AND ${
      needle
        ? sql`(name ILIKE ${"%" + needle + "%"} OR id ILIKE ${"%" + needle + "%"}
               OR city ILIKE ${"%" + needle + "%"} OR phone ILIKE ${"%" + needle + "%"})`
        : sql`TRUE`
    }
  `;
  const [rows, [count]] = await Promise.all([
    sql<StudentRow[]>`
      SELECT * FROM students WHERE ${where}
      ORDER BY created_at DESC, id DESC LIMIT ${limit}
    `,
    sql<{ n: string }[]>`SELECT COUNT(*) AS n FROM students WHERE ${where}`,
  ]);
  return { students: rows.map(toStudent), total: Number(count?.n ?? 0) };
}

/** Is this student assigned to this counsellor? Used to gate staff writes. */
export async function studentBelongsTo(
  id: string,
  counsellor: string
): Promise<boolean> {
  if (!sql) {
    return SEED_STUDENTS.some(
      (s) => s.id === id && s.counsellor.toLowerCase() === counsellor.toLowerCase()
    );
  }
  await ensureSchema();
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM students
    WHERE id = ${id} AND lower(counsellor) = lower(${counsellor})
  `;
  return rows.length > 0;
}

export async function createStudent(s: Student): Promise<Student> {
  if (!sql) return s; // demo mode: echo back, no persistence
  await ensureSchema();
  const [row] = await sql<StudentRow[]>`
    INSERT INTO students (id, name, phone, email, city, country, intake,
      counsellor, stage, test_type, score, target_score, last_updated,
      next_follow_up, notes)
    VALUES (${s.id}, ${s.name}, ${s.phone}, ${s.email}, ${s.city}, ${s.country},
      ${s.intake}, ${s.counsellor}, ${s.stage}, ${s.testType}, ${s.score},
      ${s.targetScore}, ${s.lastUpdated}, ${s.nextFollowUp}, ${s.notes})
    RETURNING *
  `;
  return toStudent(row);
}

export async function updateStudent(
  id: string,
  patch: Partial<Student>
): Promise<Student | null> {
  if (!sql) return null;
  await ensureSchema();
  const [row] = await sql<StudentRow[]>`
    UPDATE students SET
      stage          = COALESCE(${patch.stage ?? null}, stage),
      counsellor     = COALESCE(${patch.counsellor ?? null}, counsellor),
      telecaller     = COALESCE(${patch.telecaller ?? null}, telecaller),
      test_type      = COALESCE(${patch.testType ?? null}, test_type),
      score          = ${patch.score === undefined ? sql`score` : patch.score},
      next_follow_up = COALESCE(${patch.nextFollowUp ?? null}, next_follow_up),
      notes          = COALESCE(${patch.notes ?? null}, notes),
      last_updated   = COALESCE(${patch.lastUpdated ?? null}, last_updated)
    WHERE id = ${id}
    RETURNING *
  `;
  return row ? toStudent(row) : null;
}

export async function listTasks(): Promise<Task[]> {
  if (!sql) return SEED_TASKS;
  await ensureSchema();
  const rows = await sql<TaskRow[]>`
    SELECT * FROM tasks ORDER BY done ASC, due ASC, id ASC
  `;
  return rows.map(toTask);
}

export async function setTaskDone(
  id: string,
  done: boolean
): Promise<Task | null> {
  if (!sql) return null;
  await ensureSchema();
  const [row] = await sql<TaskRow[]>`
    UPDATE tasks SET done = ${done} WHERE id = ${id} RETURNING *
  `;
  return row ? toTask(row) : null;
}

// --------------------------- key/value settings ----------------------------
// The website editor and the admin password originally lived in Upstash Redis.
// Postgres is already connected for the CRM, so it can hold them too — that
// way a working setup needs one database, not two.

let settingsReady: Promise<void> | null = null;

function ensureSettingsSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!settingsReady) {
    settingsReady = createSettingsSchema().catch((e) => {
      settingsReady = null;
      throw e;
    });
  }
  return settingsReady;
}

async function createSettingsSchema(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key        text PRIMARY KEY,
      value      text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

export async function settingGet(key: string): Promise<string | null> {
  if (!sql) return null;
  await ensureSettingsSchema();
  const rows = await sql<{ value: string }[]>`
    SELECT value FROM site_settings WHERE key = ${key}
  `;
  return rows[0]?.value ?? null;
}

export async function settingSet(key: string, value: string): Promise<void> {
  if (!sql) return;
  await ensureSettingsSchema();
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

/**
 * Every counsellor name in use — staff accounts plus any name already on a
 * student. Imported spreadsheets bring in names that never had a login, and
 * those still need to be pickable so the caseload stays intact.
 */
export async function listCounsellors(): Promise<string[]> {
  if (!sql) {
    return Array.from(new Set(SEED_STUDENTS.map((s) => s.counsellor))).sort();
  }
  await ensureSchema();
  const rows = await sql<{ name: string }[]>`
    SELECT DISTINCT name FROM (
      SELECT counsellor AS name FROM students WHERE counsellor <> ''
      UNION
      SELECT name FROM staff WHERE active
    ) x
    WHERE name IS NOT NULL AND name <> ''
    ORDER BY name
  `;
  return rows.map((r) => r.name);
}

/** Counts and the short follow-up list the dashboard needs — no row dump. */
export async function overview(counsellor?: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (!sql) {
    const mine = counsellor
      ? SEED_STUDENTS.filter(
          (s) => s.counsellor.toLowerCase() === counsellor.toLowerCase()
        )
      : SEED_STUDENTS;
    return {
      total: mine.length,
      byStage: Object.fromEntries(
        mine.reduce((m, s) => m.set(s.stage, (m.get(s.stage) ?? 0) + 1), new Map())
      ) as Record<string, number>,
      dueCount: mine.filter((s) => s.nextFollowUp <= today).length,
      due: mine
        .filter((s) => s.nextFollowUp <= today)
        .slice(0, 8)
        .map((s) => ({ id: s.id, name: s.name, notes: s.notes, phone: s.phone })),
    };
  }
  await ensureSchema();
  const scoped = counsellor ?? null;
  const where = scoped === null ? sql`TRUE` : sql`lower(counsellor) = lower(${scoped})`;

  const [stageRows, [counts], due] = await Promise.all([
    sql<{ stage: string; n: string }[]>`
      SELECT stage, COUNT(*) AS n FROM students WHERE ${where} GROUP BY stage
    `,
    sql<{ total: string; due: string }[]>`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE next_follow_up <> '' AND next_follow_up <= ${today}) AS due
      FROM students WHERE ${where}
    `,
    sql<{ id: string; name: string; notes: string | null; phone: string }[]>`
      SELECT id, name, notes, phone FROM students
      WHERE ${where} AND next_follow_up <> '' AND next_follow_up <= ${today}
      ORDER BY next_follow_up ASC LIMIT 8
    `,
  ]);

  return {
    total: Number(counts?.total ?? 0),
    byStage: Object.fromEntries(stageRows.map((r) => [r.stage, Number(r.n)])),
    dueCount: Number(counts?.due ?? 0),
    due: due.map((d) => ({ ...d, notes: d.notes ?? "" })),
  };
}
