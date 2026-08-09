import { NextResponse } from "next/server";
import { dbEnabled, updateStudent } from "@/lib/db";
import { Student, TODAY } from "@/lib/crm-data";
import { isAuthed } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
