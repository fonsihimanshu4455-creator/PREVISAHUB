import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { listActivities } from "@/lib/leads/activity";
import { listCalls } from "@/lib/leads/calls";
import { listAppointments } from "@/lib/leads/appointments";
import { listInvoices } from "@/lib/leads/invoices";
import { deleteLead, getLead, updateLead } from "@/lib/leads/repo";
import { can } from "@/lib/leads/types";
import { scoreLead } from "@/lib/leads/scoring";

export const dynamic = "force-dynamic";

/** Ownership check: without leads:all, you may only touch your own leads. */
function mine(scope: string, owner: string): boolean {
  return !scope || owner.toLowerCase() === scope.toLowerCase();
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await guard();
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!mine(user.scope, lead.owner)) {
    return NextResponse.json(
      { error: "This lead belongs to someone else." },
      { status: 403 }
    );
  }

  const [activities, calls, appointments, invoices] = await Promise.all([
    listActivities(lead.id),
    listCalls({ leadId: lead.id }),
    listAppointments({ leadId: lead.id }),
    can(user.role, "money:view") ? listInvoices({ leadId: lead.id }) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    role: user.role,
    me: user.name,
    lead,
    scoreRules: scoreLead(lead).rules,
    activities,
    calls,
    appointments,
    invoices,
    canSeeMoney: can(user.role, "money:view"),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await guard("leads:edit");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!mine(user.scope, lead.owner)) {
    return NextResponse.json(
      { error: "This lead belongs to someone else." },
      { status: 403 }
    );
  }

  const body = await req.json();
  // Ownership only moves when a manager moves it (business rule 5/6).
  if ("owner" in body && !can(user.role, "leads:assign")) {
    return NextResponse.json(
      { error: "Only a manager can reassign a lead." },
      { status: 403 }
    );
  }

  const res = await updateLead(params.id, body, user.name);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ lead: res.lead });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  // Business rule 6: sales staff cannot delete leads.
  const user = await guard("leads:delete");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const ok = await deleteLead(params.id, user.name);
  if (!ok) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
