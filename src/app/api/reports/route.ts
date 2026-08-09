import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { reportSummary } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Pre-aggregated on the server: the page needs totals and a few short lists,
// not every student and payment row.
export async function GET() {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const summary = await reportSummary(
      session.role === "staff" ? session.staff.name : undefined
    );
    return NextResponse.json({ role: session.role, ...summary });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to build report", detail: String(e) },
      { status: 500 }
    );
  }
}
