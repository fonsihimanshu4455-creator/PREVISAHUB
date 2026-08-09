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

// --------------------------- dashboard summary -----------------------------
// The sales page renders totals, six months of revenue, a per-counsellor
// table, outstanding dues and a short list of recent payments. Sending every
// student and payment row so the browser can add them up meant a ~800 KB
// response at 600 students; these aggregates do the arithmetic in SQL and
// return a few KB instead.

export type ReportSummary = {
  totals: {
    billed: number; collected: number; pending: number;
    students: number; approved: number; closed: number;
  };
  byMonth: { month: string; amount: number }[];
  byCounsellor: { counsellor: string; students: number; collected: number; pending: number }[];
  dues: FeeSummary[];
  recentPayments: Payment[];
  paymentsCount: number;
};

export async function reportSummary(counsellor?: string): Promise<ReportSummary> {
  const empty: ReportSummary = {
    totals: { billed: 0, collected: 0, pending: 0, students: 0, approved: 0, closed: 0 },
    byMonth: [], byCounsellor: [], dues: [], recentPayments: [], paymentsCount: 0,
  };
  if (!sql) return empty;
  await ensureSchema();
  await ensurePaymentsSchema();

  // Sum payments per student first, so joining to students cannot multiply
  // the fee across a student's several payment rows.
  const scoped = counsellor ?? null;

  const [totalsRow] = await sql<{
    billed: string; collected: string; pending: string;
    students: string; approved: string; closed: string;
  }[]>`
    WITH paid AS (
      SELECT student_id, SUM(amount) AS paid FROM payments GROUP BY student_id
    )
    SELECT
      COALESCE(SUM(s.total_fee), 0)                                        AS billed,
      COALESCE(SUM(COALESCE(p.paid, 0)), 0)                                AS collected,
      COALESCE(SUM(GREATEST(s.total_fee - COALESCE(p.paid, 0), 0)), 0)     AS pending,
      COUNT(*)                                                             AS students,
      COUNT(*) FILTER (WHERE s.stage = 'Approved')                         AS approved,
      COUNT(*) FILTER (WHERE s.stage IN ('Approved', 'Rejected'))          AS closed
    FROM students s LEFT JOIN paid p ON p.student_id = s.id
    WHERE ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
  `;

  const monthRows = await sql<{ month: string; amount: string }[]>`
    SELECT substring(p.paid_on, 1, 7) AS month, SUM(p.amount) AS amount
    FROM payments p LEFT JOIN students s ON s.id = p.student_id
    WHERE ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
    GROUP BY 1 ORDER BY 1 DESC LIMIT 6
  `;

  const counsellorRows = await sql<{
    counsellor: string | null; students: string; collected: string; pending: string;
  }[]>`
    WITH paid AS (
      SELECT student_id, SUM(amount) AS paid FROM payments GROUP BY student_id
    )
    SELECT s.counsellor,
           COUNT(*)                                                     AS students,
           COALESCE(SUM(COALESCE(p.paid, 0)), 0)                        AS collected,
           COALESCE(SUM(GREATEST(s.total_fee - COALESCE(p.paid,0), 0)), 0) AS pending
    FROM students s LEFT JOIN paid p ON p.student_id = s.id
    WHERE ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
    GROUP BY s.counsellor
    ORDER BY collected DESC
  `;

  const dueRows = await sql<{
    id: string; name: string; counsellor: string | null; country: string;
    stage: string; total_fee: string; paid: string;
  }[]>`
    WITH paid AS (
      SELECT student_id, SUM(amount) AS paid FROM payments GROUP BY student_id
    )
    SELECT s.id, s.name, s.counsellor, s.country, s.stage, s.total_fee,
           COALESCE(p.paid, 0) AS paid
    FROM students s LEFT JOIN paid p ON p.student_id = s.id
    WHERE s.total_fee > COALESCE(p.paid, 0)
      AND ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
    ORDER BY (s.total_fee - COALESCE(p.paid, 0)) DESC
    LIMIT 200
  `;

  const recentRows = await sql<PaymentRow[]>`
    SELECT p.*, s.name AS student_name, s.counsellor
    FROM payments p LEFT JOIN students s ON s.id = p.student_id
    WHERE ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
    ORDER BY p.paid_on DESC, p.created_at DESC
    LIMIT 50
  `;

  const [countRow] = await sql<{ n: string }[]>`
    SELECT COUNT(*) AS n FROM payments p LEFT JOIN students s ON s.id = p.student_id
    WHERE ${scoped === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${scoped})`}
  `;

  return {
    totals: {
      billed: Number(totalsRow?.billed ?? 0),
      collected: Number(totalsRow?.collected ?? 0),
      pending: Number(totalsRow?.pending ?? 0),
      students: Number(totalsRow?.students ?? 0),
      approved: Number(totalsRow?.approved ?? 0),
      closed: Number(totalsRow?.closed ?? 0),
    },
    byMonth: monthRows
      .map((r) => ({ month: r.month, amount: Number(r.amount) }))
      .reverse(),
    byCounsellor: counsellorRows.map((r) => ({
      counsellor: r.counsellor || "Unassigned",
      students: Number(r.students),
      collected: Number(r.collected),
      pending: Number(r.pending),
    })),
    dues: dueRows.map((r) => {
      const totalFee = Number(r.total_fee);
      const paid = Number(r.paid);
      return {
        studentId: r.id, studentName: r.name, counsellor: r.counsellor ?? "",
        country: r.country, stage: r.stage, totalFee, paid,
        pending: Math.max(0, totalFee - paid),
      };
    }),
    recentPayments: recentRows.map(toPayment),
    paymentsCount: Number(countRow?.n ?? 0),
  };
}
