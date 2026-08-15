// ---------------------------------------------------------------------------
// The activity timeline (business rule 9).
//
// Append-only. Nothing in the application updates or deletes a row here — if
// something happened, it stays on the record with who did it and when.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";

export type ActivityKind =
  | "created" | "assigned" | "call" | "whatsapp" | "followup_created"
  | "followup_done" | "followup_missed" | "appointment_booked"
  | "appointment_completed" | "documents_requested" | "payment"
  | "status" | "score" | "note" | "converted" | "reactivated";

export type Activity = {
  id: string;
  kind: ActivityKind;
  summary: string;
  detail: string;
  actor: string;
  at: string;
};

export async function logActivity(
  leadId: string,
  kind: ActivityKind,
  summary: string,
  actor: string,
  detail = ""
): Promise<void> {
  if (!sql) return;
  await ensureLeadSchema();
  await sql`
    INSERT INTO lead_activities (lead_id, kind, summary, detail, actor)
    VALUES (${leadId}, ${kind}, ${summary}, ${detail}, ${actor})
  `;
}

/** Several entries for one action, in one round trip. */
export async function logActivities(
  leadId: string,
  actor: string,
  entries: { kind: ActivityKind; summary: string; detail?: string }[]
): Promise<void> {
  if (!sql || entries.length === 0) return;
  await ensureLeadSchema();
  await sql`
    INSERT INTO lead_activities ${sql(
      entries.map((e) => ({
        lead_id: leadId,
        kind: e.kind,
        summary: e.summary,
        detail: e.detail ?? "",
        actor,
      })),
      "lead_id", "kind", "summary", "detail", "actor"
    )}
  `;
}

export async function listActivities(
  leadId: string,
  limit = 100
): Promise<Activity[]> {
  if (!sql) return [];
  await ensureLeadSchema();
  const rows = await sql<
    { id: string; kind: string; summary: string; detail: string; actor: string; at: Date }[]
  >`
    SELECT id, kind, summary, detail, actor, at FROM lead_activities
    WHERE lead_id = ${leadId} ORDER BY at DESC, id DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: String(r.id),
    kind: r.kind as ActivityKind,
    summary: r.summary,
    detail: r.detail,
    actor: r.actor,
    at: new Date(r.at).toISOString(),
  }));
}
