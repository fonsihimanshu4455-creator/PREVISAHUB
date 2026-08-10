import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { listCounsellors } from "@/lib/db";
import { listStaff } from "@/lib/staff";
import { ensureStaffSchema } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    // The query reads the staff table, so make sure it exists first.
    await ensureStaffSchema();
    const [counsellors, staff] = await Promise.all([listCounsellors(), listStaff()]);
    const telecallers = staff
      .filter((m) => m.active && m.role === "telecaller")
      .map((m) => m.name);
    return NextResponse.json({ role: session.role, counsellors, telecallers });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load counsellors", detail: String(e) },
      { status: 500 }
    );
  }
}
