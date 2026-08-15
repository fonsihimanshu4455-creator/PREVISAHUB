import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { guard } from "@/lib/leads/auth";
import { listLeads, LeadQuery } from "@/lib/leads/repo";
import { LEAD_STATUSES, LeadStatus, REASON_REQUIRED } from "@/lib/leads/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX = 2000;

/**
 * Hand a batch of leads to somebody.
 *
 * Assigning a two-hundred-row old database one lead at a time is not a
 * workflow, so this takes either a list of ids or the filter the owner is
 * looking at, and does the lot in one statement.
 *
 * It can set the status at the same time, because the two go together: a
 * sheet imported as Cold Lead is not in anyone's call queue until it is moved
 * back into play, and doing that as a second, separate step is exactly the
 * kind of thing that gets forgotten.
 */
export async function POST(req: Request) {
  const user = await guard("leads:assign");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  if (!sql) {
    return NextResponse.json({ error: "No database connected." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const owner = String(body?.owner ?? "").trim();
  const status = String(body?.status ?? "").trim() as LeadStatus | "";

  if (status && !LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Pick a valid status." }, { status: 400 });
  }
  if (status && REASON_REQUIRED.includes(status)) {
    return NextResponse.json(
      { error: "Closing leads in bulk is not allowed — each one needs its own reason." },
      { status: 400 }
    );
  }
  if (!owner && !status) {
    return NextResponse.json(
      { error: "Choose a caller to send these to." },
      { status: 400 }
    );
  }

  // Either an explicit list, or everything matching what is on screen.
  let ids: string[] = Array.isArray(body?.ids)
    ? body.ids.map(String).filter(Boolean)
    : [];

  if (ids.length === 0 && body?.filter) {
    const f = body.filter as LeadQuery;
    const { leads } = await listLeads({
      q: f.q, status: f.status, bucket: f.bucket, source: f.source,
      destination: f.destination, visaType: f.visaType, priority: f.priority,
      due: f.due,
      limit: MAX + 1,
    });
    ids = leads.map((l) => l.id);
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "Nothing selected." }, { status: 400 });
  }
  if (ids.length > MAX) {
    return NextResponse.json(
      { error: `That is ${ids.length} leads. Assign up to ${MAX} at a time.` },
      { status: 400 }
    );
  }

  try {
    // Only the fields actually being changed are written, so assigning an
    // owner cannot quietly reset a status somebody set by hand.
    const changes: Record<string, unknown> = { updated_at: new Date() };
    if (owner) changes.owner = owner;
    if (status) changes.status = status;

    const updated = await sql<{ id: string }[]>`
      UPDATE leads SET ${sql(changes)} WHERE id = ANY(${ids}) RETURNING id
    `;

    if (owner) {
      // Keep the follow-up queue with the person who now owns the lead.
      await sql`
        UPDATE lead_followups SET owner = ${owner}
        WHERE lead_id = ANY(${ids}) AND status = 'Open'
      `;
    }

    // Business rule 9: this shows up on each lead's timeline like any other
    // change, so a reassignment is never invisible.
    const summary = [
      owner ? `Sent to ${owner}` : "",
      status ? `Status set to ${status}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    // One statement for the whole batch — a round trip per lead would be two
    // hundred round trips for one click.
    if (updated.length) {
      await sql`
        INSERT INTO lead_activities ${sql(
          updated.map((u) => ({
            lead_id: u.id,
            kind: owner ? "assigned" : "status",
            summary,
            detail: "Bulk update",
            actor: user.name,
          })),
          "lead_id", "kind", "summary", "detail", "actor"
        )}
      `;
    }

    return NextResponse.json({ ok: true, count: updated.length, owner, status });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not assign those leads", detail: String(e) },
      { status: 500 }
    );
  }
}
