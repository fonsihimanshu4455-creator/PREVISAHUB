import { NextResponse } from "next/server";
import { dbEnabled, studentBelongsTo, updateStudent } from "@/lib/db";
import { Student, TODAY } from "@/lib/crm-data";
import { requireCrmAccess } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireCrmAccess();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Staff may only edit students assigned to them — checked server-side, not
  // just hidden in the UI.
  if (
    session.role === "staff" &&
    !(await studentBelongsTo(params.id, session.staff.name))
  ) {
    return NextResponse.json(
      { error: "This student is not assigned to you." },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    const patch: Partial<Student> = {
      stage: body.stage,
      testType: body.testType,
      nextFollowUp: body.nextFollowUp,
      notes: body.notes,
      lastUpdated: TODAY,
    };
    // Reassigning a student is an admin action: a staff session changing it
    // could move students out of (or into) someone's caseload.
    if (session.role === "admin" && typeof body.counsellor === "string" && body.counsellor.trim()) {
      patch.counsellor = body.counsellor.trim();
    }

    // score is nullable — only include when the client actually sent it.
    if ("score" in body) {
      patch.score =
        body.score === null || body.score === "" ? null : Number(body.score);
    }
    if (!dbEnabled) {
      // demo mode: nothing to persist, echo the patch so the UI stays in sync
      return NextResponse.json({
        mode: "demo",
        student: { id: params.id, ...patch },
      });
    }
    const student = await updateStudent(params.id, patch);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ mode: "db", student });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to update student", detail: String(e) },
      { status: 500 }
    );
  }
}
