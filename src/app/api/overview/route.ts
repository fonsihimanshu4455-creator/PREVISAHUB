import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { overview } from "@/lib/db";
import { moneyTotals } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Everything the dashboard shows, counted in SQL. It used to download the
 * whole student list — 200 KB at 600 students — purely to count stages and
 * find today's follow-ups.
 */
export async function GET() {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const scope = session.role === "staff" ? session.staff.name : undefined;
    // One request for the whole dashboard — it used to also pull the full
    // sales report just to read two numbers off it. Staff get the counts
    // without the money: collected and pending are never put in the response
    // at all, rather than sent and hidden.
    const [data, money] = await Promise.all([
      overview(scope),
      session.role === "admin" ? moneyTotals() : Promise.resolve({}),
    ]);
    return NextResponse.json({ role: session.role, ...data, ...money });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load overview", detail: String(e) },
      { status: 500 }
    );
  }
}
