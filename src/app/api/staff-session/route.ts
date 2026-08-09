import { NextResponse } from "next/server";
import { getSession } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// Who am I? Used by the staff portal to decide between the login screen and
// the CRM, and to greet the signed-in counsellor by name.
export async function GET() {
  const session = await getSession();
  if (session.role === "staff") {
    return NextResponse.json({ role: "staff", staff: session.staff });
  }
  return NextResponse.json({ role: session.role });
}
