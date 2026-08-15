import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { createLead, listLeads } from "@/lib/leads/repo";
import { can } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await guard();
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const p = new URL(req.url).searchParams;
  try {
    const { leads, total } = await listLeads({
      // A sales executive sees their own book and nothing else, whatever the
      // query string says.
      owner: user.scope || undefined,
      q: p.get("q") ?? "",
      status: p.get("status") ?? "",
      bucket: p.get("bucket") ?? "",
      source: p.get("source") ?? "",
      destination: p.get("destination") ?? "",
      visaType: p.get("visaType") ?? "",
      priority: p.get("priority") ?? "",
      due: p.get("due") ?? "",
      queue: p.get("queue") ?? "",
      order: p.get("order") ?? "",
      from: p.get("from") ?? "",
      to: p.get("to") ?? "",
      limit: Math.min(500, Number(p.get("limit")) || 100),
      offset: Math.max(0, Number(p.get("offset")) || 0),
    });
    return NextResponse.json({ role: user.role, me: user.name, leads, total });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not load leads", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await guard("leads:edit");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  try {
    const body = await req.json();
    if (!String(body?.name ?? "").trim()) {
      return NextResponse.json({ error: "Enter the client's name." }, { status: 400 });
    }
    // Business rule 1: every lead has an owner. Without the assign permission
    // you can only file a lead under your own name.
    const owner = can(user.role, "leads:assign")
      ? String(body.owner ?? "").trim() || user.name
      : user.name;

    const res = await createLead({ ...body, owner }, user.name);
    if ("error" in res) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    return NextResponse.json({ lead: res.lead });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not save the lead", detail: String(e) },
      { status: 500 }
    );
  }
}
