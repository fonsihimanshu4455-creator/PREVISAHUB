// The dashboard, rendered on the server.
//
// It used to ship an empty page, wait for the JavaScript, then ask the API for
// the numbers — two round trips and a "Loading…" before anything appeared.
// Counting them here means the HTML that arrives already has them, and the
// browser has nothing to fetch.

import { crmSession } from "@/lib/leads/auth";
import { buildStats } from "@/lib/leads/dashboard";
import DashboardView from "@/components/salescrm/DashboardView";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const user = await crmSession();
  // The layout shows the login screen in this case; nothing to render here.
  if (!user) return null;

  try {
    return <DashboardView data={await buildStats(user)} />;
  } catch (e) {
    return (
      <div className="panel p-5 text-sm text-[color:var(--crit)]">
        Could not build the dashboard. {String(e)}
      </div>
    );
  }
}
