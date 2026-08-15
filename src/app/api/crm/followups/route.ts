import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { followUpCounts, followUpQueue, Queue, scheduleFollowUp } from "@/lib/leads/followups";
import { getLead } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

const QUEUES: Queue[] = ["today", "overdue", "tomorrow", "upcoming", "missed"];

export async function GET(req: Request) {
  const user = await guard();
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const q = new URL(req.url).searchParams.get("queue") ?? "today";
  const queue = (QUEUES.includes(q as Queue) ? q : "today") as Queue;
  const scope = user.scope || undefined;
  const [items, counts] = await Promise.all([
    followUpQueue(queue, scope),
    followUpCounts(scope),
  ]);
  return NextResponse.json({ queue, items, counts });
}

/** Re-schedule a lead's follow-up by hand. */
export async function POST(req: Request) {
  const user = await guard("leads:edit");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const body = await req.json();
  const lead = await getLead(String(body?.leadId ?? ""));
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (user.scope && lead.owner.toLowerCase() !== user.scope.toLowerCase()) {
    return NextResponse.json({ error: "This lead belongs to someone else." }, { status: 403 });
  }
  const due = String(body.due ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    return NextResponse.json({ error: "Pick a date." }, { status: 400 });
  }
  await scheduleFollowUp({
    leadId: lead.id,
    owner: lead.owner,
    due,
    time: String(body.time ?? ""),
    kind: String(body.kind ?? "Call"),
    note: String(body.note ?? ""),
    actor: user.name,
  });
  return NextResponse.json({ ok: true });
}
