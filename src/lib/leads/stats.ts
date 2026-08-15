// ---------------------------------------------------------------------------
// KPIs and charts.
//
// Every figure is counted in SQL and only the totals cross the wire — the
// dashboard never downloads a lead to count it. The rate formulas are the
// department's, written once here so the dashboard, the reports and an
// executive's own scorecard can never quote different numbers.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { ensureLeadSchema } from "./schema";
import { today } from "./followups";
import { CONNECTED_OUTCOMES, DEAD_STATUSES, QUALIFIED_STATUSES, WON_STATUS } from "./types";

export type Kpis = {
  totalLeads: number;
  newToday: number;
  newThisMonth: number;
  callsMade: number;
  connectedCalls: number;
  contactRate: number;
  qualifiedLeads: number;
  qualificationRate: number;
  appointments: number;
  appointmentRate: number;
  consultationsCompleted: number;
  showUpRate: number;
  converted: number;
  conversionRate: number;
  lost: number;
  paymentsPending: number;
  totalSales: number;
  collected: number;
  outstanding: number;
  revenuePerLead: number;
  dueToday: number;
  overdue: number;
  hotLeads: number;
  uncontacted: number;
  followUpCompletionRate: number;
  missedFollowUps: number;
};

export type Charts = {
  bySource: { label: string; value: number }[];
  byDestination: { label: string; value: number }[];
  byVisaType: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  lostReasons: { label: string; value: number }[];
  monthlyLeads: { label: string; value: number }[];
  monthlySales: { label: string; value: number }[];
  employees: EmployeeRow[];
};

export type EmployeeRow = {
  name: string;
  leads: number;
  calls: number;
  connected: number;
  qualified: number;
  appointments: number;
  converted: number;
  sales: number;
  missedFollowUps: number;
  conversionRate: number;
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

export type StatsScope = {
  /** Set for a sales executive — everything is narrowed to their own book. */
  owner?: string;
  from?: string;
  to?: string;
};

export async function kpis(scope: StatsScope = {}): Promise<Kpis> {
  const zero = Object.fromEntries(
    Object.keys({} as Kpis).map((k) => [k, 0])
  ) as Kpis;
  if (!sql) return { ...zero, totalLeads: 0 } as Kpis;
  await ensureLeadSchema();

  const { owner, from = "", to = "" } = scope;
  const t = today();
  const monthStart = t.slice(0, 8) + "01";

  const lead = owner ? sql`lower(owner) = lower(${owner})` : sql`TRUE`;
  const dateRange = sql`
    ${from ? sql`created_at >= ${from}::date` : sql`TRUE`}
    AND ${to ? sql`created_at < (${to}::date + 1)` : sql`TRUE`}
  `;

  const [[leadRow], [callRow], [apptRow], [moneyRow], [fuRow]] = await Promise.all([
    sql<Record<string, string>[]>`
      SELECT
        COUNT(*)                                                        AS total,
        COUNT(*) FILTER (WHERE created_at::date = ${t}::date)           AS new_today,
        COUNT(*) FILTER (WHERE created_at >= ${monthStart}::date)       AS new_month,
        COUNT(*) FILTER (WHERE status = ANY(${QUALIFIED_STATUSES}))     AS qualified,
        COUNT(*) FILTER (WHERE status = ${WON_STATUS})                  AS converted,
        COUNT(*) FILTER (WHERE status = ANY(${DEAD_STATUSES}))          AS lost,
        COUNT(*) FILTER (WHERE status = 'Payment Pending')              AS pay_pending,
        COUNT(*) FILTER (WHERE next_follow_up_date = ${t})              AS due_today,
        COUNT(*) FILTER (WHERE next_follow_up_date <> '' AND next_follow_up_date < ${t}) AS overdue,
        COUNT(*) FILTER (WHERE priority = 'Hot')                        AS hot,
        COUNT(*) FILTER (WHERE last_contact_date = '')                  AS uncontacted
      FROM leads WHERE ${lead} AND ${dateRange}
    `,
    sql<Record<string, string>[]>`
      SELECT COUNT(*) AS calls,
             COUNT(*) FILTER (WHERE c.outcome = ANY(${CONNECTED_OUTCOMES})) AS connected,
             COUNT(DISTINCT c.lead_id) FILTER (WHERE c.outcome = ANY(${CONNECTED_OUTCOMES})) AS connected_leads
      FROM lead_calls c JOIN leads l ON l.id = c.lead_id
      WHERE ${owner ? sql`lower(c.caller) = lower(${owner})` : sql`TRUE`}
        AND ${from ? sql`c.called_at >= ${from}::date` : sql`TRUE`}
        AND ${to ? sql`c.called_at < (${to}::date + 1)` : sql`TRUE`}
    `,
    sql<Record<string, string>[]>`
      SELECT COUNT(*) FILTER (WHERE a.status <> 'Cancelled') AS booked,
             COUNT(*) FILTER (WHERE a.status = 'Completed')  AS completed
      FROM lead_appointments a JOIN leads l ON l.id = a.lead_id
      WHERE ${owner ? sql`lower(a.executive) = lower(${owner})` : sql`TRUE`}
        AND ${from ? sql`a.date >= ${from}` : sql`TRUE`}
        AND ${to ? sql`a.date <= ${to}` : sql`TRUE`}
    `,
    sql<Record<string, string>[]>`
      SELECT COALESCE(SUM(i.total), 0) AS billed,
             COALESCE(SUM(i.paid), 0)  AS collected
      FROM lead_invoices i
      WHERE i.status <> 'Cancelled'
        AND ${owner ? sql`lower(i.executive) = lower(${owner})` : sql`TRUE`}
        AND ${from ? sql`i.created_at >= ${from}::date` : sql`TRUE`}
        AND ${to ? sql`i.created_at < (${to}::date + 1)` : sql`TRUE`}
    `,
    // Completion is Done out of what was actually settled — Done plus Missed.
    // Follow-ups still open, or superseded by a deliberate re-plan, are not a
    // pass or a fail yet and would only water the figure down.
    sql<Record<string, string>[]>`
      SELECT COUNT(*) FILTER (WHERE status = 'Done')   AS done,
             COUNT(*) FILTER (WHERE status = 'Missed') AS missed,
             COUNT(*) FILTER (WHERE status IN ('Done', 'Missed')) AS settled
      FROM lead_followups
      WHERE ${owner ? sql`lower(owner) = lower(${owner})` : sql`TRUE`}
    `,
  ]);

  const totalLeads = Number(leadRow?.total ?? 0);
  const callsMade = Number(callRow?.calls ?? 0);
  const connectedCalls = Number(callRow?.connected ?? 0);
  const connectedLeads = Number(callRow?.connected_leads ?? 0);
  const qualifiedLeads = Number(leadRow?.qualified ?? 0);
  const appointments = Number(apptRow?.booked ?? 0);
  const consultationsCompleted = Number(apptRow?.completed ?? 0);
  const converted = Number(leadRow?.converted ?? 0);
  const billed = Number(moneyRow?.billed ?? 0);
  const collected = Number(moneyRow?.collected ?? 0);
  const fuDone = Number(fuRow?.done ?? 0);
  const fuMissed = Number(fuRow?.missed ?? 0);
  const fuSettled = Number(fuRow?.settled ?? 0);

  return {
    totalLeads,
    newToday: Number(leadRow?.new_today ?? 0),
    newThisMonth: Number(leadRow?.new_month ?? 0),
    callsMade,
    connectedCalls,
    contactRate: pct(connectedLeads, totalLeads),
    qualifiedLeads,
    qualificationRate: pct(qualifiedLeads, connectedLeads),
    appointments,
    appointmentRate: pct(appointments, qualifiedLeads),
    consultationsCompleted,
    showUpRate: pct(consultationsCompleted, appointments),
    converted,
    conversionRate: pct(converted, qualifiedLeads),
    lost: Number(leadRow?.lost ?? 0),
    paymentsPending: Number(leadRow?.pay_pending ?? 0),
    totalSales: billed,
    collected,
    outstanding: Math.max(0, billed - collected),
    revenuePerLead: totalLeads > 0 ? Math.round(billed / totalLeads) : 0,
    dueToday: Number(leadRow?.due_today ?? 0),
    overdue: Number(leadRow?.overdue ?? 0),
    hotLeads: Number(leadRow?.hot ?? 0),
    uncontacted: Number(leadRow?.uncontacted ?? 0),
    followUpCompletionRate: pct(fuDone, fuSettled),
    missedFollowUps: fuMissed,
  };
}

export async function charts(scope: StatsScope = {}): Promise<Charts> {
  const empty: Charts = {
    bySource: [], byDestination: [], byVisaType: [], byStatus: [],
    lostReasons: [], monthlyLeads: [], monthlySales: [], employees: [],
  };
  if (!sql) return empty;
  await ensureLeadSchema();

  const db = sql; // narrowed for the closures below
  const { owner, from = "", to = "" } = scope;
  const lead = db`
    ${owner ? db`lower(owner) = lower(${owner})` : db`TRUE`}
    AND ${from ? db`created_at >= ${from}::date` : db`TRUE`}
    AND ${to ? db`created_at < (${to}::date + 1)` : db`TRUE`}
  `;

  const group = (column: string) =>
    db<{ label: string; value: string }[]>`
      SELECT ${db.unsafe(column)} AS label, COUNT(*) AS value
      FROM leads WHERE ${lead} AND ${db.unsafe(column)} <> ''
      GROUP BY 1 ORDER BY 2 DESC
    `;

  const [source, destination, visaType, status, lost, months, sales, employees] =
    await Promise.all([
      group("source"),
      group("destination"),
      group("visa_type"),
      group("status"),
      sql<{ label: string; value: string }[]>`
        SELECT lost_reason AS label, COUNT(*) AS value FROM leads
        WHERE ${lead} AND lost_reason <> '' GROUP BY 1 ORDER BY 2 DESC
      `,
      sql<{ label: string; value: string }[]>`
        SELECT to_char(created_at, 'YYYY-MM') AS label, COUNT(*) AS value
        FROM leads WHERE ${owner ? sql`lower(owner) = lower(${owner})` : sql`TRUE`}
        GROUP BY 1 ORDER BY 1 DESC LIMIT 12
      `,
      sql<{ label: string; value: string }[]>`
        SELECT to_char(created_at, 'YYYY-MM') AS label, COALESCE(SUM(paid), 0) AS value
        FROM lead_invoices WHERE status <> 'Cancelled'
          AND ${owner ? sql`lower(executive) = lower(${owner})` : sql`TRUE`}
        GROUP BY 1 ORDER BY 1 DESC LIMIT 12
      `,
      employeeScoreboard({ from, to }),
    ]);

  const num = (rows: { label: string; value: string }[]) =>
    rows.map((r) => ({ label: r.label, value: Number(r.value) }));

  return {
    bySource: num(source),
    byDestination: num(destination),
    byVisaType: num(visaType),
    byStatus: num(status),
    lostReasons: num(lost),
    monthlyLeads: num(months).reverse(),
    monthlySales: num(sales).reverse(),
    employees,
  };
}

/**
 * One row per person with a lead to their name. Managers read this to see who
 * is working and who is only logging in.
 */
export async function employeeScoreboard(
  range: { from?: string; to?: string } = {}
): Promise<EmployeeRow[]> {
  if (!sql) return [];
  await ensureLeadSchema();
  const { from = "", to = "" } = range;

  const rows = await sql<Record<string, string>[]>`
    WITH owners AS (
      SELECT DISTINCT owner AS name FROM leads WHERE owner <> ''
    ),
    lead_stats AS (
      SELECT owner AS name,
             COUNT(*) AS leads,
             COUNT(*) FILTER (WHERE status = ANY(${QUALIFIED_STATUSES})) AS qualified,
             COUNT(*) FILTER (WHERE status = ${WON_STATUS}) AS converted
      FROM leads
      WHERE owner <> ''
        AND ${from ? sql`created_at >= ${from}::date` : sql`TRUE`}
        AND ${to ? sql`created_at < (${to}::date + 1)` : sql`TRUE`}
      GROUP BY 1
    ),
    call_stats AS (
      SELECT caller AS name, COUNT(*) AS calls,
             COUNT(*) FILTER (WHERE outcome = ANY(${CONNECTED_OUTCOMES})) AS connected
      FROM lead_calls
      WHERE ${from ? sql`called_at >= ${from}::date` : sql`TRUE`}
        AND ${to ? sql`called_at < (${to}::date + 1)` : sql`TRUE`}
      GROUP BY 1
    ),
    appt_stats AS (
      SELECT executive AS name, COUNT(*) AS appointments
      FROM lead_appointments WHERE executive <> '' AND status <> 'Cancelled'
      GROUP BY 1
    ),
    sale_stats AS (
      SELECT executive AS name, COALESCE(SUM(paid), 0) AS sales
      FROM lead_invoices WHERE executive <> '' AND status <> 'Cancelled'
      GROUP BY 1
    ),
    miss_stats AS (
      SELECT owner AS name, COUNT(*) AS missed
      FROM lead_followups WHERE status = 'Missed' AND owner <> ''
      GROUP BY 1
    )
    SELECT o.name,
           COALESCE(l.leads, 0) AS leads,
           COALESCE(c.calls, 0) AS calls,
           COALESCE(c.connected, 0) AS connected,
           COALESCE(l.qualified, 0) AS qualified,
           COALESCE(a.appointments, 0) AS appointments,
           COALESCE(l.converted, 0) AS converted,
           COALESCE(s.sales, 0) AS sales,
           COALESCE(m.missed, 0) AS missed
    FROM owners o
    LEFT JOIN lead_stats l ON l.name = o.name
    LEFT JOIN call_stats c ON lower(c.name) = lower(o.name)
    LEFT JOIN appt_stats a ON lower(a.name) = lower(o.name)
    LEFT JOIN sale_stats s ON lower(s.name) = lower(o.name)
    LEFT JOIN miss_stats m ON lower(m.name) = lower(o.name)
    ORDER BY COALESCE(s.sales, 0) DESC, COALESCE(l.converted, 0) DESC
  `;

  return rows.map((r) => {
    const qualified = Number(r.qualified);
    const converted = Number(r.converted);
    return {
      name: r.name,
      leads: Number(r.leads),
      calls: Number(r.calls),
      connected: Number(r.connected),
      qualified,
      appointments: Number(r.appointments),
      converted,
      sales: Number(r.sales),
      missedFollowUps: Number(r.missed),
      conversionRate: pct(converted, qualified),
    };
  });
}
