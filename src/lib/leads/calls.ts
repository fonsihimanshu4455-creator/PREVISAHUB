// ---------------------------------------------------------------------------
// Call logging.
//
// Business rule 2: every call has an outcome. Rule 3: every lead still worth
// working leaves the call with a date on it. Both are enforced here, in the
// one function that writes a call, rather than trusted to the form.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";
import { logActivity } from "./activity";
import { completeOpenFollowUp, scheduleFollowUp, today } from "./followups";
import { getLead, updateLead } from "./repo";
import {
  CALL_OUTCOMES, CallOutcome, DEAD_STATUSES, OUTCOME_STATUS, TERMINAL_OUTCOMES,
} from "./types";

export type CallLog = {
  id: string;
  leadId: string;
  leadName: string;
  caller: string;
  outcome: CallOutcome;
  notes: string;
  nextAction: string;
  durationSec: number;
  calledAt: string;
};

export type LogCallInput = {
  leadId: string;
  caller: string;
  outcome: string;
  notes: string;
  nextAction: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  durationSec?: number;
  /** Only for outcomes that close the lead. */
  lostReason?: string;
};

export async function logCall(
  input: LogCallInput
): Promise<{ ok: true; nextStatus: string } | { error: string }> {
  if (!sql) return { error: "No database connected." };
  await ensureLeadSchema();

  const outcome = input.outcome as CallOutcome;
  if (!CALL_OUTCOMES.includes(outcome)) {
    return { error: "Pick a call outcome." };
  }
  if (!input.notes.trim()) {
    return { error: "Write what was said — notes are required on every call." };
  }

  const lead = await getLead(input.leadId);
  if (!lead) return { error: "Lead not found." };

  const implied = OUTCOME_STATUS[outcome] ?? lead.status;
  const closes = DEAD_STATUSES.includes(implied);

  // The lead stays in play unless the outcome ends it — and if it stays in
  // play, it needs a date. This is the rule that keeps the queue full.
  if (!closes && !TERMINAL_OUTCOMES.includes(outcome)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.nextFollowUpDate)) {
      return { error: "Set the next follow-up date before saving this call." };
    }
    if (input.nextFollowUpDate < today()) {
      return { error: "The next follow-up cannot be in the past." };
    }
    if (!input.nextAction.trim()) {
      return { error: "Say what happens next — the next action is required." };
    }
  }
  if (closes && !input.lostReason?.trim()) {
    return { error: `Pick a reason — this outcome closes the lead.` };
  }

  const id = `CL-${Math.random().toString(36).slice(2, 10)}`;
  await sql`
    INSERT INTO lead_calls (id, lead_id, caller, outcome, notes, next_action, duration_sec)
    VALUES (${id}, ${input.leadId}, ${input.caller}, ${outcome},
            ${input.notes.trim()}, ${input.nextAction.trim()},
            ${Math.max(0, Math.round(input.durationSec ?? 0))})
  `;
  await logActivity(
    input.leadId,
    outcome === "WhatsApp Sent" ? "whatsapp" : "call",
    `Call — ${outcome}`,
    input.caller,
    input.notes.trim()
  );
  await completeOpenFollowUp(input.leadId, input.caller);

  // The status the outcome implies, but never backwards: a lead that has
  // already reached Payment Pending is not knocked back to Contacted by a
  // routine chase call.
  const forward =
    implied !== lead.status && shouldAdvance(lead.status, implied)
      ? implied
      : lead.status;

  await updateLead(
    input.leadId,
    {
      status: forward,
      lastContactDate: today(),
      lastOutcome: outcome,
      nextFollowUpDate: closes ? "" : input.nextFollowUpDate,
      nextFollowUpTime: closes ? "" : input.nextFollowUpTime,
      ...(input.lostReason ? { lostReason: input.lostReason } : {}),
    },
    input.caller,
    // The follow-up is written below, once, carrying the next action.
    { schedule: false }
  );

  if (!closes && input.nextFollowUpDate) {
    await scheduleFollowUp({
      leadId: input.leadId,
      owner: lead.owner,
      due: input.nextFollowUpDate,
      time: input.nextFollowUpTime,
      note: input.nextAction,
      actor: input.caller,
    });
  }

  return { ok: true, nextStatus: forward };
}

import { OPEN_STATUSES } from "./types";

/** Only move a lead forward, or to a closing status. Never back up the funnel. */
function shouldAdvance(current: string, implied: string): boolean {
  if (DEAD_STATUSES.includes(implied as never)) return true;
  const a = (OPEN_STATUSES as readonly string[]).indexOf(current);
  const b = (OPEN_STATUSES as readonly string[]).indexOf(implied);
  if (a < 0) return true; // coming back from a closed status
  return b > a;
}

export async function listCalls(
  opts: { leadId?: string; caller?: string; from?: string; to?: string; limit?: number } = {}
): Promise<CallLog[]> {
  if (!sql) return [];
  await ensureLeadSchema();
  const { leadId, caller, from = "", to = "", limit = 200 } = opts;
  const rows = await sql<
    {
      id: string; lead_id: string; name: string; caller: string; outcome: string;
      notes: string; next_action: string; duration_sec: number; called_at: Date;
    }[]
  >`
    SELECT c.id, c.lead_id, l.name, c.caller, c.outcome, c.notes,
           c.next_action, c.duration_sec, c.called_at
    FROM lead_calls c JOIN leads l ON l.id = c.lead_id
    WHERE ${leadId ? sql`c.lead_id = ${leadId}` : sql`TRUE`}
      AND ${caller ? sql`lower(c.caller) = lower(${caller})` : sql`TRUE`}
      AND ${from ? sql`c.called_at >= ${from}::date` : sql`TRUE`}
      AND ${to ? sql`c.called_at < (${to}::date + 1)` : sql`TRUE`}
    ORDER BY c.called_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    leadId: r.lead_id,
    leadName: r.name,
    caller: r.caller,
    outcome: r.outcome as CallOutcome,
    notes: r.notes,
    nextAction: r.next_action,
    durationSec: r.duration_sec,
    calledAt: new Date(r.called_at).toISOString(),
  }));
}
