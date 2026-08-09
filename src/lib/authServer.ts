// Server-side auth helpers for the admin API routes.
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./content";
import { getAdminPassword } from "./storage";

// A session token derived from the current password. Changing the password
// invalidates all existing sessions automatically.
export function sessionToken(password: string): string {
  return createHash("sha256")
    .update(`previsahub::${password}`)
    .digest("hex");
}

// Is the current request authenticated?
export async function isAuthed(): Promise<boolean> {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return false;
  const password = await getAdminPassword();
  return cookie === sessionToken(password);
}
