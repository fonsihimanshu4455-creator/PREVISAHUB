// The telecaller's own entrance.
//
// One URL to remember, and exactly the same list the CRM shows — a caller
// should not have to know that there are two ways in, or get a different
// screen depending on which one they used.

import { crmSession } from "@/lib/leads/auth";
import { can } from "@/lib/leads/types";
import { listLeads } from "@/lib/leads/repo";
import CallingClient from "@/app/crm/calling/CallingClient";
import CallingLogin from "./CallingLogin";
import CallingHeader from "./CallingHeader";

export const dynamic = "force-dynamic";

export default async function CallingPage() {
  const user = await crmSession();
  if (!user) return <CallingLogin />;

  const { leads, total } = await listLeads({
    owner: user.scope || undefined,
    bucket: "callable",
    order: "calling",
    limit: 300,
  });

  return (
    <div className="min-h-screen bg-ground">
      <CallingHeader name={user.name} />
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <CallingClient initial={{
            leads,
            total,
            me: user.name,
            canPickCaller: can(user.role, "leads:all"),
          }} />
      </main>
    </div>
  );
}
