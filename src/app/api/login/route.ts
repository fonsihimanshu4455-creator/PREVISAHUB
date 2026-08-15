import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/content";
import { readAdminPassword } from "@/lib/storage";
import { sessionToken } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const current = await readAdminPassword();
  if (password !== current.value) {
    // "Wrong password" is a lie when the real answer is that the saved
    // password cannot be read. Say which it is — the fix is completely
    // different, and the owner has no other way to tell them apart.
    return NextResponse.json(
      {
        ok: false,
        reason: current.source,
        error:
          current.source === "unreachable"
            ? "Cannot reach the database, so your saved password could not be checked. Update DATABASE_URL in Vercel — if you reset the database password in Supabase, the connection string needs the new one."
            : current.source === "setup"
            ? "That is not the setup password. No password has been saved yet, so the one in ADMIN_PASSWORD is still in use."
            : "Wrong password. Try again.",
      },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(current.value), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
