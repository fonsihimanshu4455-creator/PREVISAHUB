import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { listCalls, logCall } from "@/lib/leads/calls";
import { getLead } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await guard();
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const p = new URL(req.url).searchParams;
  const calls = await listCalls({
    caller: user.scope || p.get("caller") || undefined,
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
    leadId: p.get("leadId") ?? undefined,
    limit: Math.min(500, Number(p.get("limit")) || 200),
  });
  return NextResponse.json({ calls });
}

/**
 * Log a call. The rules about what a call must carry (outcome, notes, next
 * action, next follow-up) are enforced inside logCall, so they hold no matter
 * which screen posts here.
 */
export async function POST(req: Request) {
  const user = await guard("calls:log");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const body = await req.json();
  const leadId = String(body?.leadId ?? "");
  const lead = await getLead(leadId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (user.scope && lead.owner.toLowerCase() !== user.scope.toLowerCase()) {
    return NextResponse.json(
      { error: "This lead belongs to someone else." },
      { status: 403 }
    );
  }

  const res = await logCall({
    leadId,
    caller: user.name,
    outcome: String(body.outcome ?? ""),
    notes: String(body.notes ?? ""),
    nextAction: String(body.nextAction ?? ""),
    nextFollowUpDate: String(body.nextFollowUpDate ?? ""),
    nextFollowUpTime: String(body.nextFollowUpTime ?? ""),
    durationSec: Number(body.durationSec ?? 0),
    lostReason: String(body.lostReason ?? ""),
  });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json(res);
}
