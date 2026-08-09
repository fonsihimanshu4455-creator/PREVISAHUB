import { NextRequest, NextResponse } from "next/server";
import { authenticateStaff, STAFF_COOKIE } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = String(body.username ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await authenticateStaff(username, password);
  if (!result) {
    // Deliberately vague: does not reveal whether the username exists.
    return NextResponse.json(
      { ok: false, error: "Wrong username or password." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true, staff: result.staff });
  res.cookies.set(STAFF_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
  return res;
}
