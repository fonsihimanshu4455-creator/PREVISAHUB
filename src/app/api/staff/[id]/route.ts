import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/authServer";
import { deleteStaff, setStaffActive, setStaffPassword } from "@/lib/staff";

export const dynamic = "force-dynamic";

// Change a staff account: activate/deactivate, or reset their password.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();

    if (typeof body.password === "string") {
      const r = await setStaffPassword(params.id, body.password);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (typeof body.active === "boolean") {
      const staff = await setStaffActive(params.id, body.active);
      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
      return NextResponse.json({ staff });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to update staff", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ok = await deleteStaff(params.id);
  if (!ok) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
