import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/authServer";
import { createStaff, listStaff, STAFF_ROLES, StaffRole } from "@/lib/staff";

export const dynamic = "force-dynamic";

// Managing staff accounts is admin-only.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ staff: await listStaff() });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load staff", detail: String(e) },
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
    const role: StaffRole = STAFF_ROLES.includes(body.role)
      ? (body.role as StaffRole)
      : "counsellor";
    const result = await createStaff(
      String(body.name ?? ""),
      String(body.username ?? ""),
      String(body.password ?? ""),
      role
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ staff: result.staff });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create staff", detail: String(e) },
      { status: 500 }
    );
  }
}
