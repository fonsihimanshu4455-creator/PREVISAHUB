import { NextResponse } from "next/server";
import { getSession } from "@/lib/authServer";
import {
  callList, CALL_OUTCOMES, CallOutcome, callerStats, logCall,
  recentCalls, studentTelecaller,
} from "@/lib/calling";

export const dynamic = "force-dynamic";

/**
 * The calling panel. A telecaller sees the numbers assigned to them; the
 * admin sees the whole board plus per-caller tallies. Counsellors have no
 * business here — the CRM is their surface.
 */
export async function GET() {
  const session = await getSession();
  if (session.role === "none") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const isTelecaller = session.role === "staff" && session.staff.role === "telecaller";
  if (session.role === "staff" && !isTelecaller) {
    return NextResponse.json({ error: "not a calling account" }, { status: 403 });
  }
  const scope = isTelecaller ? session.staff.name : undefined;

  try {
    const [targets, calls, stats] = await Promise.all([
      callList(scope),
      recentCalls({ telecaller: scope, limit: 100 }),
      session.role === "admin" ? callerStats() : Promise.resolve([]),
    ]);
    return NextResponse.json({
      role: session.role,
      telecaller: scope ?? "",
      targets,
      calls,
      stats,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load the calling list", detail: String(e) },
      { status: 500 }
    );
  }
}

/** Log one attempt. */
export async function POST(req: Request) {
  const session = await getSession();
  if (session.role === "none") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const isTelecaller = session.role === "staff" && session.staff.role === "telecaller";
  if (session.role === "staff" && !isTelecaller) {
    return NextResponse.json({ error: "not a calling account" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const studentId = String(body.studentId ?? "");
    if (!studentId) {
      return NextResponse.json({ error: "Which number was called?" }, { status: 400 });
    }
    // A telecaller may only log against numbers assigned to them.
    if (isTelecaller) {
      const owner = await studentTelecaller(studentId);
      if (!owner || owner.toLowerCase() !== session.staff.name.toLowerCase()) {
        return NextResponse.json(
          { error: "That number is not on your calling list." },
          { status: 403 }
        );
      }
    }

    const outcome = CALL_OUTCOMES.includes(body.outcome)
      ? (body.outcome as CallOutcome)
      : "Connected";
    const callbackOn = /^\d{4}-\d{2}-\d{2}$/.test(String(body.callbackOn ?? ""))
      ? String(body.callbackOn)
      : "";

    const call = await logCall({
      studentId,
      telecaller: isTelecaller ? session.staff.name : "Admin",
      outcome,
      note: String(body.note ?? ""),
      callbackOn,
    });
    if (!call) {
      return NextResponse.json({ error: "No database connected." }, { status: 503 });
    }
    return NextResponse.json({ call });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to log the call", detail: String(e) },
      { status: 500 }
    );
  }
}
