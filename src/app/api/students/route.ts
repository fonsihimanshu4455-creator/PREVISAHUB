import { NextResponse } from "next/server";
import { createStudent, dbEnabled, listStudents } from "@/lib/db";
import { Student, TODAY } from "@/lib/crm-data";
import { isAuthed } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// Student records are personal data, so every route here requires an admin
// session — reads included, unlike the public site-content endpoint.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const students = await listStudents();
    return NextResponse.json({ mode: dbEnabled ? "db" : "demo", students });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load students", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
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
      counsellor: body.counsellor || "Rohit Sharma",
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
