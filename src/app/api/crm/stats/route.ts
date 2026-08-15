import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { buildStats } from "@/lib/leads/dashboard";

export const dynamic = "force-dynamic";

/**
 * The whole dashboard in one request, counted in SQL — the browser never sees
 * a lead row here.
 *
 * The dashboard page renders its first view on the server and does not call
 * this at all; this serves the refreshes, when the reports page changes its
 * date range.
 */
export async function GET(req: Request) {
  const user = await guard();
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const p = new URL(req.url).searchParams;
  try {
    return NextResponse.json(
      await buildStats(user, { from: p.get("from") ?? "", to: p.get("to") ?? "" })
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Could not build the dashboard", detail: String(e) },
      { status: 500 }
    );
  }
}
