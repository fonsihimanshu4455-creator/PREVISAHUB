// The caller's list, rendered on the server.
//
// "Everything assigned to me that is still worth ringing" — one list, in the
// order it should be worked. No tabs: a caller with numbers to call does not
// need to choose which pile to look at first.

import { assignableUsers, crmSession } from "@/lib/leads/auth";
import { can } from "@/lib/leads/types";
import { callQueueCounts, listLeads } from "@/lib/leads/repo";
import CallingClient from "./CallingClient";

export const dynamic = "force-dynamic";

export default async function CallingPage() {
  const user = await crmSession();
  if (!user) return null;

  const canAssign = can(user.role, "leads:assign");

  // Opens on what is due today; the other piles load when a tab is clicked.
  // The team comes down with the page for whoever can hand leads out, so the
  // picker is already populated the first time they use it.
  const [{ leads, total }, counts, team] = await Promise.all([
    listLeads({
      owner: user.scope || undefined,
      bucket: "callable",
      queue: "tocall",
      order: "calling",
      limit: 300,
    }),
    callQueueCounts(user.scope || undefined),
    canAssign ? assignableUsers() : Promise.resolve([]),
  ]);

  return <CallingClient initial={{
        leads,
        total,
        me: user.name,
        counts,
        canPickCaller: can(user.role, "leads:all"),
        canAssign,
        team: team.map((t) => t.name).filter((n) => n !== user.name),
      }} />;
}
