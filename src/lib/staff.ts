// ---------------------------------------------------------------------------
// Staff accounts.
//
// Each counsellor gets their own login. A staff member only ever sees the
// students assigned to them (matched on the student's `counsellor` field);
// the admin sees everyone.
//
// Passwords are stored as scrypt hashes with a per-account salt — never in
// plain text, unlike the single shared admin password this sits alongside.
// ---------------------------------------------------------------------------

import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { sql, ensureSchema } from "./db";

export const STAFF_COOKIE = "pvh_staff";

/**
 * What a staff member does. Counsellors work the CRM for their own students;
 * telecallers get a calling list instead and never see the wider pipeline.
 */
export type StaffRole = "counsellor" | "telecaller";
export const STAFF_ROLES: StaffRole[] = ["counsellor", "telecaller"];

export type Staff = {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
};

type StaffRow = {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  role: string | null;
  active: boolean;
  created_at: string | Date;
};

function toStaff(r: StaffRow): Staff {
  return {
    id: r.id,
    name: r.name,
    username: r.username,
    role: (r.role === "telecaller" ? "telecaller" : "counsellor") as StaffRole,
    active: r.active,
    createdAt: String(r.created_at),
  };
}

// --------------------------- password hashing ------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, key] = parts;
  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, expected.length);
  // Lengths always match here, but guard anyway — timingSafeEqual throws if not.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Session value for a staff member: `<id>.<digest>`. The digest is derived
 * from the stored password hash, so changing or deactivating an account
 * invalidates that person's existing sessions — the same property the admin
 * session has.
 */
export function staffSessionToken(id: string, passwordHash: string): string {
  const digest = createHash("sha256")
    .update(`previsahub-staff::${id}::${passwordHash}`)
    .digest("hex");
  return `${id}.${digest}`;
}

// --------------------------- schema ----------------------------------------

let staffReady: Promise<void> | null = null;

export function ensureStaffSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!staffReady) {
    staffReady = createStaffSchema().catch((e) => {
      staffReady = null;
      throw e;
    });
  }
  return staffReady;
}

async function createStaffSchema(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS staff (
      id            text PRIMARY KEY,
      name          text NOT NULL,
      username      text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      active        boolean NOT NULL DEFAULT true,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;
  // Added after the table shipped, so existing installs pick it up too.
  await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'counsellor'`;
}

// --------------------------- queries ---------------------------------------

export async function listStaff(): Promise<Staff[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureStaffSchema();
  const rows = await sql<StaffRow[]>`
    SELECT * FROM staff ORDER BY created_at ASC
  `;
  return rows.map(toStaff);
}

export async function createStaff(
  name: string,
  username: string,
  password: string,
  role: StaffRole = "counsellor"
): Promise<{ ok: true; staff: Staff } | { ok: false; error: string }> {
  if (!sql) return { ok: false, error: "No database connected." };
  await ensureSchema();
  await ensureStaffSchema();

  const uname = username.trim().toLowerCase();
  if (!name.trim()) return { ok: false, error: "Name is required." };
  if (!/^[a-z0-9._-]{3,32}$/.test(uname)) {
    return {
      ok: false,
      error:
        "Username must be 3-32 characters, using letters, numbers, dot, dash or underscore.",
    };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const existing = await sql<{ id: string }[]>`
    SELECT id FROM staff WHERE username = ${uname}
  `;
  if (existing.length) {
    return { ok: false, error: "That username is already taken." };
  }

  const id = `ST-${randomBytes(4).toString("hex")}`;
  const [row] = await sql<StaffRow[]>`
    INSERT INTO staff (id, name, username, password_hash, role)
    VALUES (${id}, ${name.trim()}, ${uname}, ${hashPassword(password)},
            ${STAFF_ROLES.includes(role) ? role : "counsellor"})
    RETURNING *
  `;
  return { ok: true, staff: toStaff(row) };
}

export async function setStaffRole(
  id: string,
  role: StaffRole
): Promise<Staff | null> {
  if (!sql) return null;
  await ensureStaffSchema();
  const [row] = await sql<StaffRow[]>`
    UPDATE staff SET role = ${role} WHERE id = ${id} RETURNING *
  `;
  return row ? toStaff(row) : null;
}

export async function setStaffActive(
  id: string,
  active: boolean
): Promise<Staff | null> {
  if (!sql) return null;
  await ensureStaffSchema();
  const [row] = await sql<StaffRow[]>`
    UPDATE staff SET active = ${active} WHERE id = ${id} RETURNING *
  `;
  return row ? toStaff(row) : null;
}

export async function setStaffPassword(
  id: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!sql) return { ok: false, error: "No database connected." };
  await ensureStaffSchema();
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  const rows = await sql`
    UPDATE staff SET password_hash = ${hashPassword(password)} WHERE id = ${id}
    RETURNING id
  `;
  return rows.length ? { ok: true } : { ok: false, error: "Staff not found." };
}

export async function deleteStaff(id: string): Promise<boolean> {
  if (!sql) return false;
  await ensureStaffSchema();
  const rows = await sql`DELETE FROM staff WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** Check a username/password pair. Returns the account and its session value. */
export async function authenticateStaff(
  username: string,
  password: string
): Promise<{ staff: Staff; token: string } | null> {
  if (!sql) return null;
  await ensureStaffSchema();
  const rows = await sql<StaffRow[]>`
    SELECT * FROM staff WHERE username = ${username.trim().toLowerCase()}
  `;
  const row = rows[0];
  if (!row || !row.active) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    staff: toStaff(row),
    token: staffSessionToken(row.id, row.password_hash),
  };
}

/** Resolve a staff session cookie back to the account it belongs to. */
export async function staffFromToken(token: string): Promise<Staff | null> {
  if (!sql || !token.includes(".")) return null;
  await ensureStaffSchema();
  const id = token.split(".")[0];
  const rows = await sql<StaffRow[]>`SELECT * FROM staff WHERE id = ${id}`;
  const row = rows[0];
  if (!row || !row.active) return null;
  if (staffSessionToken(row.id, row.password_hash) !== token) return null;
  return toStaff(row);
}
