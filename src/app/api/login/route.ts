import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/content";
import { getAdminPassword } from "@/lib/storage";
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

  const current = await getAdminPassword();
  if (password !== current) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(current), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
