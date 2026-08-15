// ---------------------------------------------------------------------------
// The dashboard payload, built once and used twice.
//
// The page renders it on the server so the first paint already has the
// numbers; the API serves the same thing when the browser refreshes a date
// range. Both call this, so the money-stripping rules cannot come apart
// between the two paths.
// ---------------------------------------------------------------------------

import { charts, kpis, StatsScope } from "./stats";
import { can, CrmRole } from "./types";
import type { Charts, Kpis } from "./stats";

export type StatsPayload = {
  role: CrmRole;
  me: string;
  seesMoney: boolean;
  seesEveryone: boolean;
  kpis: Kpis;
  charts: Charts;
};

export async function buildStats(
  user: { name: string; role: CrmRole; scope: string },
  range: { from?: string; to?: string } = {}
): Promise<StatsPayload> {
  const scope: StatsScope = {
    owner: user.scope || undefined,
    from: range.from ?? "",
    to: range.to ?? "",
  };
  const [k, c] = await Promise.all([kpis(scope), charts(scope)]);
  const seesMoney = can(user.role, "money:view");

  if (!seesMoney) {
    // Removed, not hidden — a sales executive's dashboard should not contain
    // the revenue figures at all.
    k.totalSales = 0;
    k.collected = 0;
    k.outstanding = 0;
    k.revenuePerLead = 0;
    c.monthlySales = [];
    c.employees = c.employees.map((e) => ({ ...e, sales: 0 }));
  }

  return {
    role: user.role,
    me: user.name,
    seesMoney,
    seesEveryone: !user.scope,
    kpis: k,
    charts: c,
  };
}
