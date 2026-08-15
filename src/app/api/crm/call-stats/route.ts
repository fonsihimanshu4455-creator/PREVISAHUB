import { NextResponse } from "next/server";
import { crmSession } from "@/lib/leads/auth";
import { callerStats } from "@/lib/leads/callstats";
import { can } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

/**
 * A caller's own scorecard. Anyone without leads:all sees only their own
 * numbers, whatever they ask for — a caller cannot look up a colleague's.
 */
export async function GET(req: Request) {
  const user = await crmSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const p = new URL(req.url).searchParams;
  const asked = p.get("caller") ?? "";
  const caller = can(user.role, "leads:all") ? asked || undefined : user.name;
  const days = Math.min(365, Math.max(1, Number(p.get("days")) || 30));

  try {
    return NextResponse.json(await callerStats(caller, days));
  } catch (e) {
    return NextResponse.json(
      { error: "Could not load the call figures", detail: String(e) },
      { status: 500 }
    );
  }
}
