// Server-side auth helpers for the admin and staff API routes.
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./content";
import { getAdminPassword } from "./storage";
import { STAFF_COOKIE, Staff, staffFromToken } from "./staff";

// A session token derived from the current password. Changing the password
// invalidates all existing sessions automatically.
export function sessionToken(password: string): string {
  return createHash("sha256")
    .update(`previsahub::${password}`)
    .digest("hex");
}

// Is the current request authenticated as the admin?
export async function isAuthed(): Promise<boolean> {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return false;
  const password = await getAdminPassword();
  return cookie === sessionToken(password);
}

export type Session =
  | { role: "admin" }
  | { role: "staff"; staff: Staff }
  | { role: "none" };

/**
 * Who is making this request? The admin cookie wins when both are present, so
 * an owner who also holds a staff session still gets full access.
 */
export async function getSession(): Promise<Session> {
  if (await isAuthed()) return { role: "admin" };
  const staffCookie = cookies().get(STAFF_COOKIE)?.value;
  if (staffCookie) {
    const staff = await staffFromToken(staffCookie);
    if (staff) return { role: "staff", staff };
  }
  return { role: "none" };
}

/** Admin or staff — used by the CRM routes both roles share. */
export async function requireCrmAccess(): Promise<Session | null> {
  const s = await getSession();
  return s.role === "none" ? null : s;
}
