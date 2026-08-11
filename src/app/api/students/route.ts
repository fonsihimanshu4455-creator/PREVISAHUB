import { NextResponse } from "next/server";
import { createStudent, dbEnabled, listStudents } from "@/lib/db";
import { Student, TODAY } from "@/lib/crm-data";
import { requireCrmAccess } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// Student records are personal data, so every route here requires a session —
// reads included, unlike the public site-content endpoint. Staff sessions are
// scoped to their own caseload.
export async function GET(req: Request) {
  const session = await requireCrmAccess();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const p = new URL(req.url).searchParams;
    const { students, total } = await listStudents({
      counsellor: session.role === "staff" ? session.staff.name : undefined,
      q: p.get("q") ?? "",
      stage: p.get("stage") ?? "",
      country: p.get("country") ?? "",
      due: p.get("due") ?? "",
      limit: Math.min(500, Number(p.get("limit")) || 200),
    });
    return NextResponse.json({
      mode: dbEnabled ? "db" : "demo",
      role: session.role,
      students,
      total,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load students", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await requireCrmAccess();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body?.name?.trim() || !body?.phone?.trim()) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }
    const name: string = body.name.trim();
    // Staff can only file leads under their own name.
    const counsellor =
      session.role === "staff"
        ? session.staff.name
        : body.counsellor || "Rohit Sharma";

    const student: Student = {
      id: `PVH-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      phone: body.phone.trim(),
      email:
        body.email?.trim() ||
        `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      city: body.city?.trim() || "—",
      country: body.country || "Canada",
      intake: body.intake || "May 2027",
      counsellor,
      stage: "Enquiry",
      testType: "Not Taken",
      score: null,
      targetScore: 6.0,
      lastUpdated: TODAY,
      nextFollowUp: TODAY,
      notes: body.notes?.trim() || "New lead added via CRM.",
    };
    const saved = await createStudent(student);
    return NextResponse.json({ mode: dbEnabled ? "db" : "demo", student: saved });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create student", detail: String(e) },
      { status: 500 }
    );
  }
}
