import { NextRequest, NextResponse } from "next/server";
import { setAdminPassword, storageConfigured } from "@/lib/storage";
import { isAuthed } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// Protected: change the admin password (stored in the database).
export async function PUT(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!storageConfigured()) {
    return NextResponse.json({ ok: false, error: "no-storage" }, { status: 503 });
  }
  let password = "";
  try {
    const body = await req.json();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ ok: false, error: "too-short" }, { status: 400 });
  }
  await setAdminPassword(password);
  return NextResponse.json({ ok: true });
}
