// The Kanban board, with its cards rendered on the server.

import { crmSession } from "@/lib/leads/auth";
import { listLeads } from "@/lib/leads/repo";
import PipelineClient from "./PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const user = await crmSession();
  if (!user) return null;
  const { leads } = await listLeads({
    owner: user.scope || undefined,
    limit: 500,
  });
  return <PipelineClient initial={leads} />;
}
