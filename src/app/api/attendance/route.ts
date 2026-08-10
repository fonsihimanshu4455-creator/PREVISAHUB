import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { studentBelongsTo } from "@/lib/db";
import {
  ATTENDANCE_STATUSES, AttendanceStatus, attendanceForDate,
  attendanceSummary, markAttendance,
} from "@/lib/academics";

export const dynamic = "force-dynamic";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const scope = session.role === "staff" ? session.staff.name : undefined;
  const dateParam = new URL(req.url).searchParams.get("date");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : today();
  try {
    const [records, summary] = await Promise.all([
      attendanceForDate(date, scope),
      attendanceSummary(scope),
    ]);
    return NextResponse.json({ role: session.role, date, records, summary });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load attendance", detail: String(e) },
      { status: 500 }
    );
  }
}

// Mark one student, or a whole batch in one call.
export async function POST(req: Request) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const entries: { studentId: string; status: string }[] = Array.isArray(body.entries)
      ? body.entries
      : [{ studentId: body.studentId, status: body.status }];

    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? ""))
      ? String(body.date)
      : today();

    const saved = [];
    for (const e of entries) {
      const studentId = String(e.studentId ?? "");
      if (!studentId) continue;
      if (
        session.role === "staff" &&
        !(await studentBelongsTo(studentId, session.staff.name))
      ) {
        return NextResponse.json(
          { error: "One of those students is not assigned to you." },
          { status: 403 }
        );
      }
      const status: AttendanceStatus = ATTENDANCE_STATUSES.includes(
        e.status as AttendanceStatus
      )
        ? (e.status as AttendanceStatus)
        : "Present";
      const rec = await markAttendance({
        studentId, date, status, note: String(body.note ?? ""),
      });
      if (rec) saved.push(rec);
    }
    return NextResponse.json({ ok: true, date, saved });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to save attendance", detail: String(e) },
      { status: 500 }
    );
  }
}
