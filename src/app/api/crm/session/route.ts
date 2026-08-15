import { NextResponse } from "next/server";
import { assignableUsers, crmSession } from "@/lib/leads/auth";
import { can, ROLE_LABELS } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

/** Who am I, what may I do, and who can I assign to — one call on page load. */
export async function GET() {
  const user = await crmSession();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { ...user, label: ROLE_LABELS[user.role] },
    permissions: {
      seesEveryone: can(user.role, "leads:all"),
      canEdit: can(user.role, "leads:edit"),
      canAssign: can(user.role, "leads:assign"),
      canDelete: can(user.role, "leads:delete"),
      canCall: can(user.role, "calls:log"),
      canBook: can(user.role, "appointments:manage"),
      seesMoney: can(user.role, "money:view"),
      editsMoney: can(user.role, "money:edit"),
      seesReports: can(user.role, "reports:view"),
      managesStaff: can(user.role, "employees:manage"),
    },
    team: can(user.role, "leads:assign") ? await assignableUsers() : [],
  });
}
