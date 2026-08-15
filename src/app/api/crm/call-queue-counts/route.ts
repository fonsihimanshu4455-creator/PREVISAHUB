import { NextResponse } from "next/server";
import { crmSession } from "@/lib/leads/auth";
import { callQueueCounts } from "@/lib/leads/repo";

export const dynamic = "force-dynamic";

/** The tab numbers on the calling panel, refreshed after each outcome. */
export async function GET() {
  const user = await crmSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  return NextResponse.json({ counts: await callQueueCounts(user.scope || undefined) });
}
