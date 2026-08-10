import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/authServer";
import { assignTelecaller } from "@/lib/calling";

export const dynamic = "force-dynamic";

// Handing numbers out is the admin's job — a telecaller must not be able to
// claim leads or push them onto someone else.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const studentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds.map(String)
      : [];
    if (studentIds.length === 0) {
      return NextResponse.json({ error: "Pick at least one number." }, { status: 400 });
    }
    // An empty name unassigns, which is how a lead is taken off a list.
    const telecaller = String(body.telecaller ?? "").trim();
    const count = await assignTelecaller(studentIds, telecaller);
    return NextResponse.json({ ok: true, assigned: count, telecaller });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to assign", detail: String(e) },
      { status: 500 }
    );
  }
}
