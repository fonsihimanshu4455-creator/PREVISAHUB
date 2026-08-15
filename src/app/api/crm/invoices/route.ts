import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { createInvoice, listInvoices, recordPayment } from "@/lib/leads/invoices";
import { getLead } from "@/lib/leads/repo";
import { today } from "@/lib/leads/followups";

export const dynamic = "force-dynamic";

// Sales figures are money — only roles with money:view get past here at all.
export async function GET(req: Request) {
  const user = await guard("money:view");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const p = new URL(req.url).searchParams;
  const invoices = await listInvoices({
    leadId: p.get("leadId") ?? undefined,
    executive: p.get("executive") ?? undefined,
    status: p.get("status") ?? "",
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const user = await guard("money:edit");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const body = await req.json();

  // Recording a payment against an existing invoice.
  if (body?.invoiceId) {
    const res = await recordPayment(
      String(body.invoiceId),
      Number(body.amount),
      String(body.method ?? "Cash"),
      String(body.paidOn ?? today()),
      user.name
    );
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json(res);
  }

  const lead = await getLead(String(body?.leadId ?? ""));
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const res = await createInvoice({
    leadId: lead.id,
    service: String(body.service ?? "Other"),
    total: Number(body.total),
    paid: Number(body.paid ?? 0),
    method: String(body.method ?? ""),
    paidOn: String(body.paidOn ?? ""),
    executive: lead.owner,
    consultant: String(body.consultant ?? ""),
    notes: String(body.notes ?? ""),
    actor: user.name,
  });
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res);
}
