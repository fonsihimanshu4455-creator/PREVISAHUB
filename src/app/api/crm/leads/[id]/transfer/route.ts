import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { crmSession } from "@/lib/leads/auth";
import { logActivity } from "@/lib/leads/activity";
import { getLead } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

/**
 * Hand a lead back to the admin.
 *
 * A caller cannot reassign leads — that is a manager's job, and letting people
 * pass work sideways to each other is how leads stop having an owner. But they
 * do need a way to say "this one is not for me": someone who wants a
 * consultation, a wrong number that is really a live enquiry, an angry caller.
 * So this one move is allowed, and only this one: their own lead, back to
 * nobody, with a note on the timeline saying who sent it and why.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await crmSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!sql) {
    return NextResponse.json({ error: "No database connected." }, { status: 503 });
  }

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // You may only hand back something that is actually yours.
  if (user.scope && lead.owner.toLowerCase() !== user.scope.toLowerCase()) {
    return NextResponse.json(
      { error: "That lead is not assigned to you." },
      { status: 403 }
    );
  }

  const note = String((await req.json().catch(() => ({})))?.note ?? "").trim();

  await sql`
    UPDATE leads
    SET owner = '', transferred_from = ${user.name}, transferred_at = now(),
        updated_at = now()
    WHERE id = ${params.id}
  `;
  await sql`
    UPDATE lead_followups SET owner = '' WHERE lead_id = ${params.id} AND status = 'Open'
  `;
  await logActivity(
    params.id,
    "assigned",
    `Transferred back to admin by ${user.name}`,
    user.name,
    note
  );

  return NextResponse.json({ ok: true });
}
