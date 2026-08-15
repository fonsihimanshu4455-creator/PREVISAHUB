// ---------------------------------------------------------------------------
// Sales against a lead.
//
// Balance is not stored — it is total − paid, computed everywhere from those
// two, so a part payment can never leave the books disagreeing with
// themselves. The status follows the same arithmetic.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";
import { logActivity } from "./activity";
import { updateLead } from "./repo";
import { Invoice, InvoiceStatus } from "./types";

// Statuses, methods, services and the record shape live in types.ts — see the
// note there about keeping the Postgres driver out of the browser bundle.
export type { Invoice, InvoiceStatus } from "./types";
export { INVOICE_STATUSES, PAY_METHODS, SERVICES } from "./types";

type Row = {
  id: string; lead_id: string; name: string; number: string; service: string;
  total: string; paid: string; method: string; paid_on: string; status: string;
  executive: string; consultant: string; notes: string; created_at: Date;
};

function toInvoice(r: Row): Invoice {
  const total = Number(r.total);
  const paid = Number(r.paid);
  return {
    id: r.id, leadId: r.lead_id, leadName: r.name, number: r.number,
    service: r.service, total, paid, balance: Math.max(0, total - paid),
    method: r.method, paidOn: r.paid_on, status: r.status as InvoiceStatus,
    executive: r.executive, consultant: r.consultant, notes: r.notes,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/** Pending → Partially Paid → Paid, derived rather than chosen. */
export function statusFor(total: number, paid: number): InvoiceStatus {
  if (paid <= 0) return "Pending";
  if (paid + 0.001 >= total) return "Paid";
  return "Partially Paid";
}

async function nextNumber(): Promise<string> {
  if (!sql) return "INV-0001";
  const [row] = await sql<{ n: string }[]>`SELECT COUNT(*) AS n FROM lead_invoices`;
  return `INV-${String(Number(row?.n ?? 0) + 1).padStart(4, "0")}`;
}

export async function createInvoice(input: {
  leadId: string; service: string; total: number; paid?: number;
  method?: string; paidOn?: string; executive?: string; consultant?: string;
  notes?: string; actor: string;
}): Promise<{ invoice: Invoice } | { error: string }> {
  if (!sql) return { error: "No database connected." };
  await ensureLeadSchema();
  if (!Number.isFinite(input.total) || input.total <= 0) {
    return { error: "Enter the amount agreed." };
  }
  const paid = Math.max(0, Number(input.paid ?? 0));
  if (paid > input.total) {
    return { error: "Amount paid cannot be more than the total." };
  }

  const id = `IN-${Math.random().toString(36).slice(2, 10)}`;
  const number = await nextNumber();
  const status = statusFor(input.total, paid);
  const [row] = await sql<Row[]>`
    WITH ins AS (
      INSERT INTO lead_invoices (id, lead_id, number, service, total, paid,
        method, paid_on, status, executive, consultant, notes)
      VALUES (${id}, ${input.leadId}, ${number}, ${input.service}, ${input.total},
        ${paid}, ${input.method ?? ""}, ${input.paidOn ?? ""}, ${status},
        ${input.executive ?? ""}, ${input.consultant ?? ""}, ${input.notes ?? ""})
      RETURNING *
    )
    SELECT ins.*, l.name FROM ins JOIN leads l ON l.id = ins.lead_id
  `;

  await logActivity(
    input.leadId, "payment",
    paid > 0
      ? `Payment received ₹${paid.toLocaleString("en-IN")} of ₹${input.total.toLocaleString("en-IN")} (${number})`
      : `Invoice ${number} raised for ₹${input.total.toLocaleString("en-IN")}`,
    input.actor,
    input.service
  );
  // Business rule 8: a converted lead has payment on the record. Raising an
  // invoice moves the lead to Payment Pending, and clearing it converts.
  await updateLead(
    input.leadId,
    { status: status === "Paid" ? "Converted/Won" : "Payment Pending" },
    input.actor
  );
  return { invoice: toInvoice(row) };
}

export async function recordPayment(
  id: string,
  amount: number,
  method: string,
  paidOn: string,
  actor: string
): Promise<{ invoice: Invoice } | { error: string }> {
  if (!sql) return { error: "No database connected." };
  await ensureLeadSchema();
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than zero." };
  }
  const [current] = await sql<Row[]>`
    SELECT i.*, l.name FROM lead_invoices i JOIN leads l ON l.id = i.lead_id
    WHERE i.id = ${id}
  `;
  if (!current) return { error: "Invoice not found." };

  const total = Number(current.total);
  const paid = Number(current.paid) + amount;
  if (paid > total + 0.001) {
    return { error: `That is more than the ₹${(total - Number(current.paid)).toLocaleString("en-IN")} outstanding.` };
  }
  const status = statusFor(total, paid);
  const [row] = await sql<Row[]>`
    WITH upd AS (
      UPDATE lead_invoices
      SET paid = ${paid}, status = ${status}, method = ${method},
          paid_on = ${paidOn}
      WHERE id = ${id} RETURNING *
    )
    SELECT upd.*, l.name FROM upd JOIN leads l ON l.id = upd.lead_id
  `;
  await logActivity(
    current.lead_id, "payment",
    `Payment received ₹${amount.toLocaleString("en-IN")} (${current.number})`,
    actor
  );
  if (status === "Paid") {
    await updateLead(current.lead_id, { status: "Converted/Won" }, actor);
  }
  return { invoice: toInvoice(row) };
}

export async function listInvoices(
  opts: { leadId?: string; executive?: string; status?: string; from?: string; to?: string; limit?: number } = {}
): Promise<Invoice[]> {
  if (!sql) return [];
  await ensureLeadSchema();
  const { leadId, executive, status = "", from = "", to = "", limit = 300 } = opts;
  const rows = await sql<Row[]>`
    SELECT i.*, l.name FROM lead_invoices i JOIN leads l ON l.id = i.lead_id
    WHERE ${leadId ? sql`i.lead_id = ${leadId}` : sql`TRUE`}
      AND ${executive ? sql`lower(i.executive) = lower(${executive})` : sql`TRUE`}
      AND ${status ? sql`i.status = ${status}` : sql`TRUE`}
      AND ${from ? sql`i.created_at >= ${from}::date` : sql`TRUE`}
      AND ${to ? sql`i.created_at < (${to}::date + 1)` : sql`TRUE`}
    ORDER BY i.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(toInvoice);
}
