// ---------------------------------------------------------------------------
// Tele-sales CRM schema.
//
// Kept apart from the student/case tables in db.ts: a lead is a person who
// might buy, a student is a file being processed. They meet at exactly one
// point — leads.handover_student_id — and nowhere else.
//
// Memoised like the core schema: idempotent, but each statement is a network
// round trip, so it runs once per server instance rather than per request.
// ---------------------------------------------------------------------------

import { schemaGuard, sql } from "../db";

// One catalog query on a cold instance instead of twenty DDL round trips —
// see the note on schemaGuard in db.ts.
export const ensureLeadSchema = schemaGuard(
  {
    tables: [
      "leads", "lead_calls", "lead_followups", "lead_appointments",
      "lead_invoices", "lead_activities",
    ],
    columns: ["leads.city"],
    indexes: ["leads_phone10_uniq", "leads_follow_idx", "leads_status_idx"],
  },
  () => createLeadSchema()
);

async function createLeadSchema(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id                text PRIMARY KEY,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now(),
      source            text NOT NULL DEFAULT 'Other',
      name              text NOT NULL,
      phone             text NOT NULL,
      whatsapp          text NOT NULL DEFAULT '',
      email             text NOT NULL DEFAULT '',
      city              text NOT NULL DEFAULT '',
      residence         text NOT NULL DEFAULT '',
      language          text NOT NULL DEFAULT '',
      age               int,
      occupation        text NOT NULL DEFAULT '',
      destination       text NOT NULL DEFAULT '',
      visa_type         text NOT NULL DEFAULT 'Student',
      current_visa      text NOT NULL DEFAULT 'None',
      previous_refusal  boolean NOT NULL DEFAULT false,
      travel_history    text NOT NULL DEFAULT '',
      education         text NOT NULL DEFAULT '',
      work_experience   text NOT NULL DEFAULT '',
      english_test      text NOT NULL DEFAULT 'Not Started',
      budget            numeric(12,2),
      expected_application text NOT NULL DEFAULT '',
      owner             text NOT NULL DEFAULT '',
      score             int NOT NULL DEFAULT 0,
      status            text NOT NULL DEFAULT 'New Lead',
      priority          text NOT NULL DEFAULT 'Cold',
      next_follow_up_date text NOT NULL DEFAULT '',
      next_follow_up_time text NOT NULL DEFAULT '',
      last_contact_date text NOT NULL DEFAULT '',
      last_outcome      text NOT NULL DEFAULT '',
      lost_reason       text NOT NULL DEFAULT '',
      notes             text NOT NULL DEFAULT '',
      handover_student_id text NOT NULL DEFAULT ''
    )
  `;

  // Added after the table shipped, so existing installs pick it up too.
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT ''`;

  // The three ways the floor actually reads this table: my leads, the
  // follow-up queue, and the pipeline board.
  await sql`CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads (lower(owner))`;
  await sql`CREATE INDEX IF NOT EXISTS leads_follow_idx ON leads (next_follow_up_date)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status)`;
  // Stops the same number being loaded twice from two campaigns. Matched on
  // the last 10 digits, because the same person arrives as 98765 11111 from
  // one form and +91 98765 11111 from another.
  await sql`DROP INDEX IF EXISTS leads_phone_uniq`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS leads_phone10_uniq
    ON leads (right(regexp_replace(phone, '[^0-9]', '', 'g'), 10))
    WHERE phone <> ''
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS lead_calls (
      id          text PRIMARY KEY,
      lead_id     text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      caller      text NOT NULL,
      outcome     text NOT NULL,
      notes       text NOT NULL DEFAULT '',
      next_action text NOT NULL DEFAULT '',
      duration_sec int NOT NULL DEFAULT 0,
      called_at   timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS lead_calls_lead_idx ON lead_calls (lead_id, called_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS lead_calls_caller_idx ON lead_calls (lower(caller), called_at DESC)`;

  // Follow-ups are rows, not a date column, so "missed" is a fact we can
  // report on rather than something inferred after the date has moved on.
  await sql`
    CREATE TABLE IF NOT EXISTS lead_followups (
      id          text PRIMARY KEY,
      lead_id     text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      owner       text NOT NULL DEFAULT '',
      due_date    text NOT NULL,
      due_time    text NOT NULL DEFAULT '',
      kind        text NOT NULL DEFAULT 'Call',
      note        text NOT NULL DEFAULT '',
      status      text NOT NULL DEFAULT 'Open',
      completed_at timestamptz,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS lead_followups_due_idx ON lead_followups (status, due_date)`;
  await sql`CREATE INDEX IF NOT EXISTS lead_followups_lead_idx ON lead_followups (lead_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS lead_appointments (
      id          text PRIMARY KEY,
      lead_id     text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      consultant  text NOT NULL DEFAULT '',
      executive   text NOT NULL DEFAULT '',
      date        text NOT NULL,
      time        text NOT NULL DEFAULT '',
      visa_type   text NOT NULL DEFAULT '',
      kind        text NOT NULL DEFAULT 'In-office',
      status      text NOT NULL DEFAULT 'Booked',
      notes       text NOT NULL DEFAULT '',
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS lead_appt_date_idx ON lead_appointments (date, status)`;

  // Sales against a lead. Separate from the students' fee ledger in
  // payments.ts, which tracks a file already in progress.
  await sql`
    CREATE TABLE IF NOT EXISTS lead_invoices (
      id          text PRIMARY KEY,
      lead_id     text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      number      text NOT NULL,
      service     text NOT NULL DEFAULT '',
      total       numeric(12,2) NOT NULL DEFAULT 0,
      paid        numeric(12,2) NOT NULL DEFAULT 0,
      method      text NOT NULL DEFAULT '',
      paid_on     text NOT NULL DEFAULT '',
      status      text NOT NULL DEFAULT 'Pending',
      executive   text NOT NULL DEFAULT '',
      consultant  text NOT NULL DEFAULT '',
      notes       text NOT NULL DEFAULT '',
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS lead_invoices_lead_idx ON lead_invoices (lead_id)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS lead_invoices_number_uniq ON lead_invoices (number)`;

  // Business rule 9: every important change is on the record, with who and
  // when. Append-only — nothing in the app updates or deletes an activity.
  await sql`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id        bigserial PRIMARY KEY,
      lead_id   text NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      kind      text NOT NULL,
      summary   text NOT NULL,
      detail    text NOT NULL DEFAULT '',
      actor     text NOT NULL DEFAULT '',
      at        timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON lead_activities (lead_id, at DESC)`;
}
