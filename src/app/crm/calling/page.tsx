// The call queue, rendered on the server.

import { crmSession } from "@/lib/leads/auth";
import { callQueueCounts, listLeads } from "@/lib/leads/repo";
import CallingClient from "./CallingClient";

export const dynamic = "force-dynamic";

export default async function CallingPage() {
  const user = await crmSession();
  if (!user) return null;
  const owner = user.scope || undefined;

  // Opens on Overdue — the queue that matters most and the one the floor is
  // supposed to clear first.
  const [{ leads }, counts] = await Promise.all([
    listLeads({ owner, bucket: "open", due: "overdue", limit: 200 }),
    callQueueCounts(owner),
  ]);

  return <CallingClient initial={{ tab: "overdue", leads, counts }} />;
}
