import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { crmSession } from "@/lib/leads/auth";
import { logActivity } from "@/lib/leads/activity";
import { getLead } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

/**
 * Add a note to a lead.
 *
 * Notes are appended, never overwritten: two callers a week apart both learned
 * something, and the second one should not erase the first. Each note also
 * lands on the timeline with who wrote it and when, so the lead's notes field
 * stays readable while the history stays complete.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await crmSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!sql) {
    return NextResponse.json({ error: "No database connected." }, { status: 503 });
  }

  const note = String((await req.json().catch(() => ({})))?.note ?? "").trim();
  if (!note) return NextResponse.json({ error: "Write something first." }, { status: 400 });
  if (note.length > 2000) {
    return NextResponse.json({ error: "That note is too long." }, { status: 400 });
  }

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (user.scope && lead.owner.toLowerCase() !== user.scope.toLowerCase()) {
    return NextResponse.json(
      { error: "That lead is not assigned to you." },
      { status: 403 }
    );
  }

  const stamped = `${new Date().toISOString().slice(0, 10)} ${user.name}: ${note}`;
  const [row] = await sql<{ notes: string }[]>`
    UPDATE leads
    SET notes = CASE WHEN notes = '' THEN ${stamped} ELSE notes || E'\n' || ${stamped} END,
        updated_at = now()
    WHERE id = ${params.id}
    RETURNING notes
  `;
  await logActivity(params.id, "note", "Note added", user.name, note);

  return NextResponse.json({ ok: true, notes: row?.notes ?? "" });
}
