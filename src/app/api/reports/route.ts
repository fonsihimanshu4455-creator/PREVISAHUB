import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { feeSummaries, listPayments } from "@/lib/payments";
import { listStudents } from "@/lib/db";

export const dynamic = "force-dynamic";

// Everything the sales dashboard needs, scoped to the caller's role.
export async function GET() {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const scope = session.role === "staff" ? session.staff.name : undefined;
  try {
    const [students, payments, fees] = await Promise.all([
      listStudents(scope),
      listPayments(scope),
      feeSummaries(scope),
    ]);
    return NextResponse.json({ role: session.role, students, payments, fees });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to build report", detail: String(e) },
      { status: 500 }
    );
  }
}
