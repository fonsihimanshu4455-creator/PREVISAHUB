import { NextResponse } from "next/server";
import { assignableUsers, guard, setCrmRole } from "@/lib/leads/auth";
import { employeeScoreboard } from "@/lib/leads/stats";
import { CRM_ROLES, CrmRole } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await guard("leads:all");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const [team, scoreboard] = await Promise.all([
    assignableUsers(),
    employeeScoreboard(),
  ]);
  return NextResponse.json({ team, scoreboard });
}

/** Only the owner changes what a role can reach. */
export async function PATCH(req: Request) {
  const user = await guard("employees:manage");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const body = await req.json();
  const role = String(body?.role ?? "") as CrmRole;
  if (!CRM_ROLES.includes(role) || role === "admin") {
    return NextResponse.json({ error: "Pick a valid role." }, { status: 400 });
  }
  const ok = await setCrmRole(String(body.id ?? ""), role);
  if (!ok) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
