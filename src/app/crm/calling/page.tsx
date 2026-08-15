// The caller's list, rendered on the server.
//
// "Everything assigned to me that is still worth ringing" — one list, in the
// order it should be worked. No tabs: a caller with numbers to call does not
// need to choose which pile to look at first.

import { crmSession } from "@/lib/leads/auth";
import { listLeads } from "@/lib/leads/repo";
import CallingClient from "./CallingClient";

export const dynamic = "force-dynamic";

export default async function CallingPage() {
  const user = await crmSession();
  if (!user) return null;

  const { leads, total } = await listLeads({
    owner: user.scope || undefined,
    bucket: "callable",
    order: "calling",
    limit: 300,
  });

  return <CallingClient initial={{ leads, total, me: user.name }} />;
}
