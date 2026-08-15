import { NextResponse } from "next/server";
import { denyMoneyAccess } from "@/lib/authServer";
import { reportSummary } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Pre-aggregated on the server: the page needs totals and a few short lists,
// not every student and payment row. Owner only — see denyMoneyAccess.
export async function GET() {
  const denied = await denyMoneyAccess();
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }
  try {
    const summary = await reportSummary();
    return NextResponse.json({ role: "admin", ...summary });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to build report", detail: String(e) },
      { status: 500 }
    );
  }
}
