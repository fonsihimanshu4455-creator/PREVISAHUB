// The follow-up queues, with the one being asked for rendered on the server.

import { crmSession } from "@/lib/leads/auth";
import { followUpCounts, followUpQueue, Queue } from "@/lib/leads/followups";
import FollowUpsClient from "./FollowUpsClient";

export const dynamic = "force-dynamic";

const QUEUES: Queue[] = ["today", "overdue", "tomorrow", "upcoming", "missed"];

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await crmSession();
  if (!user) return null;

  const asked = searchParams.queue;
  const queue = (QUEUES.includes(asked as Queue) ? asked : "today") as Queue;
  const scope = user.scope || undefined;

  const [items, counts] = await Promise.all([
    followUpQueue(queue, scope),
    followUpCounts(scope),
  ]);

  return <FollowUpsClient initial={{ queue, items, counts }} />;
}
