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

/**
 * Fees, payments and totals are the owner's business. Counsellors and
 * telecallers get the whole CRM without ever seeing what a student paid or
 * what the office has collected — so this is enforced here, on the server,
 * rather than by hiding a tab on their screen.
 *
 * Returns null when the request may see money, or the response to send back.
 */
export async function denyMoneyAccess(): Promise<
  { status: number; error: string } | null
> {
  const s = await getSession();
  if (s.role === "admin") return null;
  if (s.role === "none") return { status: 401, error: "unauthorized" };
  return {
    status: 403,
    error: "Payment details are only on the owner's account.",
  };
}
