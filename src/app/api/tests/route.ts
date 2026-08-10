import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { studentBelongsTo } from "@/lib/db";
import {
  addTest, defaultMax, EXAM_KINDS, ExamKind, listTests, sectionProgress,
  TEST_KINDS, TEST_SECTIONS, TestKind, TestSection,
} from "@/lib/academics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const scope = session.role === "staff" ? session.staff.name : undefined;
  const studentId = new URL(req.url).searchParams.get("studentId") ?? undefined;
  try {
    const [tests, progress] = await Promise.all([
      listTests({ counsellor: scope, studentId }),
      sectionProgress(scope),
    ]);
    return NextResponse.json({ role: session.role, tests, progress });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load tests", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const studentId = String(body.studentId ?? "");
    if (!studentId) {
      return NextResponse.json({ error: "Pick a student first." }, { status: 400 });
    }
    if (
      session.role === "staff" &&
      !(await studentBelongsTo(studentId, session.staff.name))
    ) {
      return NextResponse.json(
        { error: "This student is not assigned to you." },
        { status: 403 }
      );
    }

    const exam: ExamKind = EXAM_KINDS.includes(body.exam) ? body.exam : "PTE";
    const kind: TestKind = TEST_KINDS.includes(body.kind) ? body.kind : "Weekly";
    const section: TestSection = TEST_SECTIONS.includes(body.section)
      ? body.section
      : "Overall";

    const score = Number(body.score);
    const maxScore = Number(body.maxScore) || defaultMax(exam);
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${maxScore}.` },
        { status: 400 }
      );
    }
    const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(String(body.takenOn ?? ""))
      ? String(body.takenOn)
      : new Date().toISOString().slice(0, 10);

    const test = await addTest({
      studentId, exam, kind, section, score, maxScore, takenOn,
      note: String(body.note ?? ""),
    });
    if (!test) {
      return NextResponse.json({ error: "No database connected." }, { status: 503 });
    }
    return NextResponse.json({ test });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to save test", detail: String(e) },
      { status: 500 }
    );
  }
}
