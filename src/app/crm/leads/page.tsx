// The lead list, with its first page rendered on the server.
//
// The filters below are all URL parameters, so the server can honour whatever
// the link asked for — arriving from a dashboard tile lands straight on the
// filtered list, with the rows already in the HTML.

import { crmSession } from "@/lib/leads/auth";
import { listLeads } from "@/lib/leads/repo";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";

const PAGE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await crmSession();
  if (!user) return null;

  const one = (k: string) => {
    const v = searchParams[k];
    return typeof v === "string" ? v : "";
  };

  const initial = await listLeads({
    owner: user.scope || undefined,
    q: one("q"),
    status: one("status"),
    bucket: one("bucket"),
    source: one("source"),
    destination: one("destination"),
    visaType: one("visaType"),
    priority: one("priority"),
    due: one("due"),
    limit: PAGE,
  });

  return <LeadsClient initial={initial} />;
}
