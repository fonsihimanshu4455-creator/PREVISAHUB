// ---------------------------------------------------------------------------
// Fees & payments.
//
// A student has a total agreed fee; payments are the instalments received
// against it. Pending = total fee - sum(payments). Amounts are rupees stored
// as numeric(12,2) so partial payments and refunds stay exact.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";
import { sql, ensureSchema } from "./db";

export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Card" | "Cheque";
export const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Card",
  "Cheque",
];

export type PaymentPurpose =
  | "Consultation"
  | "Application"
  | "Coaching"
  | "Visa Fee"
  | "Other";
export const PAYMENT_PURPOSES: PaymentPurpose[] = [
  "Consultation",
  "Application",
  "Coaching",
  "Visa Fee",
  "Other",
];

export type Payment = {
  id: string;
  studentId: string;
  studentName: string;
  counsellor: string;
  amount: number;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  paidOn: string; // YYYY-MM-DD
  note: string;
};

type PaymentRow = {
  id: string;
  student_id: string;
  student_name: string | null;
  counsellor: string | null;
  amount: string | number;
  method: string;
  purpose: string;
  paid_on: string;
  note: string | null;
};

function toPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name ?? "",
    counsellor: r.counsellor ?? "",
    amount: Number(r.amount),
    method: r.method as PaymentMethod,
    purpose: r.purpose as PaymentPurpose,
    paidOn: r.paid_on,
    note: r.note ?? "",
  };
}

let paymentsReady: Promise<void> | null = null;

export function ensurePaymentsSchema(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!paymentsReady) {
    paymentsReady = createPaymentsSchema().catch((e) => {
      paymentsReady = null;
      throw e;
    });
  }
  return paymentsReady;
}

async function createPaymentsSchema(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id         text PRIMARY KEY,
      student_id text NOT NULL,
      amount     numeric(12,2) NOT NULL,
      method     text NOT NULL DEFAULT 'Cash',
      purpose    text NOT NULL DEFAULT 'Application',
      paid_on    text NOT NULL,
      note       text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS payments_student_idx ON payments (student_id)`;
  // Agreed fee lives on the student; added here so existing tables get it too.
  await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS total_fee numeric(12,2) NOT NULL DEFAULT 0`;
}

/** Payments joined to their student, optionally scoped to one counsellor. */
export async function listPayments(counsellor?: string): Promise<Payment[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensurePaymentsSchema();
  const rows = counsellor
    ? await sql<PaymentRow[]>`
        SELECT p.*, s.name AS student_name, s.counsellor
        FROM payments p LEFT JOIN students s ON s.id = p.student_id
        WHERE lower(s.counsellor) = lower(${counsellor})
        ORDER BY p.paid_on DESC, p.created_at DESC
      `
    : await sql<PaymentRow[]>`
        SELECT p.*, s.name AS student_name, s.counsellor
        FROM payments p LEFT JOIN students s ON s.id = p.student_id
        ORDER BY p.paid_on DESC, p.created_at DESC
      `;
  return rows.map(toPayment);
}

export async function addPayment(input: {
  studentId: string;
  amount: number;
  method: PaymentMethod;
  purpose: PaymentPurpose;
  paidOn: string;
  note?: string;
}): Promise<Payment | null> {
  if (!sql) return null;
  await ensureSchema();
  await ensurePaymentsSchema();
  const id = `PAY-${randomBytes(4).toString("hex")}`;
  await sql`
    INSERT INTO payments (id, student_id, amount, method, purpose, paid_on, note)
    VALUES (${id}, ${input.studentId}, ${input.amount}, ${input.method},
            ${input.purpose}, ${input.paidOn}, ${input.note ?? ""})
  `;
  const [row] = await sql<PaymentRow[]>`
    SELECT p.*, s.name AS student_name, s.counsellor
    FROM payments p LEFT JOIN students s ON s.id = p.student_id
    WHERE p.id = ${id}
  `;
  return row ? toPayment(row) : null;
}

export async function deletePayment(id: string): Promise<boolean> {
  if (!sql) return false;
  await ensurePaymentsSchema();
  const rows = await sql`DELETE FROM payments WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function setStudentFee(
  studentId: string,
  totalFee: number
): Promise<boolean> {
  if (!sql) return false;
  await ensurePaymentsSchema();
  const rows = await sql`
    UPDATE students SET total_fee = ${totalFee} WHERE id = ${studentId}
    RETURNING id
  `;
  return rows.length > 0;
}

/** Which student does this payment belong to? Used to gate staff deletes. */
export async function paymentCounsellor(id: string): Promise<string | null> {
  if (!sql) return null;
  await ensurePaymentsSchema();
  const rows = await sql<{ counsellor: string | null }[]>`
    SELECT s.counsellor FROM payments p
    LEFT JOIN students s ON s.id = p.student_id
    WHERE p.id = ${id}
  `;
  return rows[0]?.counsellor ?? null;
}

// --------------------------- reporting -------------------------------------

export type FeeSummary = {
  studentId: string;
  studentName: string;
  counsellor: string;
  country: string;
  stage: string;
  totalFee: number;
  paid: number;
  pending: number;
};

export async function feeSummaries(counsellor?: string): Promise<FeeSummary[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensurePaymentsSchema();
  type Row = {
    id: string; name: string; counsellor: string | null; country: string;
    stage: string; total_fee: string | number; paid: string | number;
  };
  const rows = counsellor
    ? await sql<Row[]>`
        SELECT s.id, s.name, s.counsellor, s.country, s.stage, s.total_fee,
               COALESCE(SUM(p.amount), 0) AS paid
        FROM students s LEFT JOIN payments p ON p.student_id = s.id
        WHERE lower(s.counsellor) = lower(${counsellor})
        GROUP BY s.id, s.name, s.counsellor, s.country, s.stage, s.total_fee
        ORDER BY s.name
      `
    : await sql<Row[]>`
        SELECT s.id, s.name, s.counsellor, s.country, s.stage, s.total_fee,
               COALESCE(SUM(p.amount), 0) AS paid
        FROM students s LEFT JOIN payments p ON p.student_id = s.id
        GROUP BY s.id, s.name, s.counsellor, s.country, s.stage, s.total_fee
        ORDER BY s.name
      `;
  return rows.map((r) => {
    const totalFee = Number(r.total_fee);
    const paid = Number(r.paid);
    return {
      studentId: r.id,
      studentName: r.name,
      counsellor: r.counsellor ?? "",
      country: r.country,
      stage: r.stage,
      totalFee,
      paid,
      // A student can overpay (refund pending); never report negative dues.
      pending: Math.max(0, totalFee - paid),
    };
  });
}
