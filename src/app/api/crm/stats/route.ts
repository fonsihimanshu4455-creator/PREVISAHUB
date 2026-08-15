import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { charts, kpis } from "@/lib/leads/stats";
import { can } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

/**
 * The whole dashboard in one request. Counted in SQL — the browser never sees
 * a lead row here.
 *
 * Money figures are stripped for roles without money:view rather than sent and
 * hidden, so a sales executive's dashboard genuinely does not contain the
 * revenue numbers.
 */
export async function GET(req: Request) {
  const user = await guard();
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }
  const p = new URL(req.url).searchParams;
  const scope = {
    owner: user.scope || undefined,
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
  };

  try {
    const [k, c] = await Promise.all([kpis(scope), charts(scope)]);
    const seesMoney = can(user.role, "money:view");

    if (!seesMoney) {
      k.totalSales = 0;
      k.collected = 0;
      k.outstanding = 0;
      k.revenuePerLead = 0;
      c.monthlySales = [];
      c.employees = c.employees.map((e) => ({ ...e, sales: 0 }));
    }

    return NextResponse.json({
      role: user.role,
      me: user.name,
      seesMoney,
      seesEveryone: !user.scope,
      kpis: k,
      charts: c,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not build the dashboard", detail: String(e) },
      { status: 500 }
    );
  }
}
