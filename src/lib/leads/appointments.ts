// ---------------------------------------------------------------------------
// Consultation appointments.
//
// Booking one moves the lead to Consultation Booked; completing one moves it
// to Consultation Completed. The show-up rate the managers watch is simply
// Completed / Booked, so those two transitions have to be recorded here and
// not left to whoever remembers to change the status.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";
import { logActivity } from "./activity";
import { updateLead } from "./repo";
import { Appointment, AppointmentStatus } from "./types";

// The statuses, kinds and the record shape live in types.ts — see the note
// there about keeping the Postgres driver out of the browser bundle.
export type { Appointment, AppointmentStatus } from "./types";
export { APPOINTMENT_KINDS, APPOINTMENT_STATUSES } from "./types";

type Row = {
  id: string; lead_id: string; name: string; phone: string; consultant: string;
  executive: string; date: string; time: string; visa_type: string; kind: string;
  status: string; notes: string; created_at: Date;
};

function toAppointment(r: Row): Appointment {
  return {
    id: r.id, leadId: r.lead_id, leadName: r.name, phone: r.phone,
    consultant: r.consultant, executive: r.executive, date: r.date, time: r.time,
    visaType: r.visa_type, kind: r.kind, status: r.status as AppointmentStatus,
    notes: r.notes, createdAt: new Date(r.created_at).toISOString(),
  };
}

const SELECT = sql
  ? sql`
      SELECT a.id, a.lead_id, l.name, l.phone, a.consultant, a.executive,
             a.date, a.time, a.visa_type, a.kind, a.status, a.notes, a.created_at
      FROM lead_appointments a JOIN leads l ON l.id = a.lead_id
    `
  : null;

export async function bookAppointment(input: {
  leadId: string; consultant: string; executive: string; date: string;
  time: string; visaType?: string; kind?: string; notes?: string; actor: string;
}): Promise<{ appointment: Appointment } | { error: string }> {
  if (!sql) return { error: "No database connected." };
  await ensureLeadSchema();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: "Pick a date for the consultation." };
  }
  if (!input.consultant.trim()) return { error: "Pick a consultant." };

  const id = `AP-${Math.random().toString(36).slice(2, 10)}`;
  await sql`
    INSERT INTO lead_appointments (id, lead_id, consultant, executive, date,
      time, visa_type, kind, status, notes)
    VALUES (${id}, ${input.leadId}, ${input.consultant}, ${input.executive},
      ${input.date}, ${input.time ?? ""}, ${input.visaType ?? ""},
      ${input.kind ?? "In-office"}, 'Booked', ${input.notes ?? ""})
  `;
  await logActivity(
    input.leadId, "appointment_booked",
    `Consultation booked with ${input.consultant} on ${input.date} ${input.time}`,
    input.actor
  );
  // The consultation IS the next touch, so it becomes the follow-up.
  await updateLead(
    input.leadId,
    {
      status: "Consultation Booked",
      nextFollowUpDate: input.date,
      nextFollowUpTime: input.time ?? "",
    },
    input.actor
  );
  const [row] = await sql<Row[]>`${SELECT!} WHERE a.id = ${id}`;
  return { appointment: toAppointment(row) };
}

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  actor: string
): Promise<{ appointment: Appointment } | { error: string }> {
  if (!sql) return { error: "No database connected." };
  await ensureLeadSchema();
  const [row] = await sql<Row[]>`
    WITH upd AS (
      UPDATE lead_appointments SET status = ${status} WHERE id = ${id}
      RETURNING *
    )
    SELECT upd.id, upd.lead_id, l.name, l.phone, upd.consultant, upd.executive,
           upd.date, upd.time, upd.visa_type, upd.kind, upd.status, upd.notes,
           upd.created_at
    FROM upd JOIN leads l ON l.id = upd.lead_id
  `;
  if (!row) return { error: "Appointment not found." };
  const appt = toAppointment(row);

  if (status === "Completed") {
    await logActivity(appt.leadId, "appointment_completed", "Consultation completed", actor);
    await updateLead(appt.leadId, { status: "Consultation Completed" }, actor);
  } else if (status === "No Show") {
    await logActivity(appt.leadId, "status", "Consultation no-show", actor);
  }
  return { appointment: appt };
}

export async function listAppointments(
  opts: { from?: string; to?: string; consultant?: string; executive?: string; status?: string; leadId?: string; limit?: number } = {}
): Promise<Appointment[]> {
  if (!sql || !SELECT) return [];
  await ensureLeadSchema();
  const { from = "", to = "", consultant, executive, status = "", leadId, limit = 200 } = opts;
  const rows = await sql<Row[]>`
    ${SELECT}
    WHERE ${from ? sql`a.date >= ${from}` : sql`TRUE`}
      AND ${to ? sql`a.date <= ${to}` : sql`TRUE`}
      AND ${consultant ? sql`lower(a.consultant) = lower(${consultant})` : sql`TRUE`}
      AND ${executive ? sql`lower(a.executive) = lower(${executive})` : sql`TRUE`}
      AND ${status ? sql`a.status = ${status}` : sql`TRUE`}
      AND ${leadId ? sql`a.lead_id = ${leadId}` : sql`TRUE`}
    ORDER BY a.date ASC, a.time ASC
    LIMIT ${limit}
  `;
  return rows.map(toAppointment);
}
