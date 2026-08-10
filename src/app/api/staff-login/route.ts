import { NextRequest, NextResponse } from "next/server";
import { authenticateStaff, STAFF_COOKIE } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let username = "";
  let password = "";
  // Which panel the form belongs to. Checked before a session is issued, so
  // signing in on the wrong page fails there instead of landing somewhere
  // that then has nothing to show.
  let expect = "";
  try {
    const body = await req.json();
    username = String(body.username ?? "");
    password = String(body.password ?? "");
    expect = String(body.expect ?? "");
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

  if (expect && result.staff.role !== expect) {
    const goes =
      result.staff.role === "telecaller"
        ? { where: "/calling", label: "Calling Panel" }
        : { where: "/staff", label: "Staff Portal" };
    return NextResponse.json(
      {
        ok: false,
        error: `That account signs in at the ${goes.label}.`,
        redirect: goes.where,
      },
      { status: 403 }
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
