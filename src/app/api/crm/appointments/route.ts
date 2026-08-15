import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import {
  APPOINTMENT_STATUSES, AppointmentStatus, bookAppointment, listAppointments,
  setAppointmentStatus,
} from "@/lib/leads/appointments";
import { getLead } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await guard();
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const p = new URL(req.url).searchParams;
  const appointments = await listAppointments({
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
    status: p.get("status") ?? "",
    // Consultants see their own diary; executives see the ones they booked.
    consultant: user.role === "consultant" ? user.name : p.get("consultant") ?? undefined,
    executive: user.scope || undefined,
  });
  return NextResponse.json({ appointments });
}

export async function POST(req: Request) {
  const user = await guard("appointments:manage");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const body = await req.json();
  const lead = await getLead(String(body?.leadId ?? ""));
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (user.scope && lead.owner.toLowerCase() !== user.scope.toLowerCase()) {
    return NextResponse.json({ error: "This lead belongs to someone else." }, { status: 403 });
  }

  const res = await bookAppointment({
    leadId: lead.id,
    consultant: String(body.consultant ?? ""),
    executive: lead.owner || user.name,
    date: String(body.date ?? ""),
    time: String(body.time ?? ""),
    visaType: lead.visaType,
    kind: String(body.kind ?? "In-office"),
    notes: String(body.notes ?? ""),
    actor: user.name,
  });
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res);
}

export async function PATCH(req: Request) {
  const user = await guard("appointments:manage");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const body = await req.json();
  const status = String(body?.status ?? "") as AppointmentStatus;
  if (!APPOINTMENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Pick a valid status." }, { status: 400 });
  }
  const res = await setAppointmentStatus(String(body.id ?? ""), status, user.name);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res);
}
