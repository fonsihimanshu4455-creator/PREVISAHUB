"use client";

// The management dashboard. One request, everything counted in SQL, and every
// figure is a link into the list of records behind it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/salescrm/Shell";
import { BarList, Kpi, Trend, formatINR, formatINRShort } from "@/components/salescrm/ui";
import type { Charts, Kpis } from "@/lib/leads/stats";

type Payload = {
  seesMoney: boolean;
  seesEveryone: boolean;
  kpis: Kpis;
  charts: Charts;
};

export default function CrmDashboard() {
  const { user } = useCrm();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/crm/stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <div className="panel p-5 text-sm text-[color:var(--crit)]">{error}</div>;
  }
  if (!data) {
    return <div className="panel p-5 text-sm text-[color:var(--text-faint)]">Loading…</div>;
  }

  const k = data.kpis;
  const rate = (n: number) => `${n}%`;

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Sales floor</p>
        <h1 className="mt-1 font-display text-display-lg font-bold">
          {data.seesEveryone ? "Dashboard" : `${user.name}'s numbers`}
        </h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
          {data.seesEveryone
            ? "Everything the department did, counted live."
            : "Your own leads, calls and follow-ups."}
        </p>
      </div>

      {/* Volume */}
      <section>
        <h2 className="eyebrow mb-2">Leads</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
          <Kpi label="Total leads" value={k.totalLeads} sub="on the board" href="/crm/leads" />
          <Kpi label="New today" value={k.newToday} sub="added today" href="/crm/leads?due=uncontacted" />
          <Kpi label="New this month" value={k.newThisMonth} sub="this month" href="/crm/leads" />
          <Kpi label="Hot leads" value={k.hotLeads} tone="crit" sub="score 61+" href="/crm/leads?priority=Hot" />
          <Kpi label="Uncontacted" value={k.uncontacted} tone="warn" sub="never called" href="/crm/leads?due=uncontacted" />
        </div>
      </section>

      {/* Activity */}
      <section>
        <h2 className="eyebrow mb-2">Calling</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
          <Kpi label="Calls made" value={k.callsMade} sub="logged" href="/crm/calling" />
          <Kpi label="Connected" value={k.connectedCalls} sub="someone answered" />
          <Kpi label="Contact rate" value={k.contactRate} format={rate} sub="leads reached" tone="info" />
          <Kpi label="Due today" value={k.dueToday} tone="warn" sub="follow-ups" href="/crm/followups?queue=today" />
          <Kpi label="Overdue" value={k.overdue} tone="crit" sub="past their date" href="/crm/followups?queue=overdue" />
        </div>
      </section>

      {/* Funnel */}
      <section>
        <h2 className="eyebrow mb-2">Funnel</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Kpi label="Qualified" value={k.qualifiedLeads} sub={`${k.qualificationRate}% of reached`} href="/crm/leads?bucket=qualified" />
          <Kpi label="Appointments" value={k.appointments} sub={`${k.appointmentRate}% of qualified`} href="/crm/appointments" />
          <Kpi label="Consultations" value={k.consultationsCompleted} sub={`${k.showUpRate}% show-up`} href="/crm/appointments?status=Completed" />
          <Kpi label="Payments pending" value={k.paymentsPending} tone="warn" sub="awaiting money" href="/crm/leads?status=Payment%20Pending" />
          <Kpi label="Converted" value={k.converted} tone="good" sub={`${k.conversionRate}% conversion`} href="/crm/leads?bucket=won" />
          <Kpi label="Lost" value={k.lost} tone="crit" sub="closed out" href="/crm/leads?bucket=dead" />
        </div>
      </section>

      {/* Money — only for roles that may see it */}
      {data.seesMoney && (
        <section>
          <h2 className="eyebrow mb-2">Money</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Total sales" value={k.totalSales} format={formatINRShort} sub="invoiced" tone="good" href="/crm/sales" />
            <Kpi label="Collected" value={k.collected} format={formatINRShort} sub="in the bank" tone="good" href="/crm/sales" />
            <Kpi label="Outstanding" value={k.outstanding} format={formatINRShort} sub="still owed" tone="crit" href="/crm/sales?status=Partially%20Paid" />
            <Kpi label="Revenue per lead" value={k.revenuePerLead} format={formatINR} sub="sales ÷ leads" />
          </div>
        </section>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Leads by source"
          rows={data.charts.bySource}
          colour="var(--brand)"
        />
        <BarList
          title="Leads by destination"
          rows={data.charts.byDestination}
          colour="var(--info)"
        />
        <BarList
          title="Leads by visa type"
          rows={data.charts.byVisaType}
          colour="#4a72b0"
        />
        <BarList title="Leads by status" rows={data.charts.byStatus} colour="#6b8dc0" />
        <Trend title="Leads per month" rows={data.charts.monthlyLeads} />
        {data.seesMoney && (
          <Trend
            title="Collected per month"
            rows={data.charts.monthlySales}
            format={formatINRShort}
          />
        )}
        <BarList
          title="Why we lose leads"
          rows={data.charts.lostReasons}
          colour="var(--crit)"
          empty="No lost leads recorded."
        />
        <div className="panel overflow-hidden p-0">
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="font-display text-[14px] font-bold">Employee performance</h3>
            <Link href="/crm/team" className="text-[12.5px] font-semibold text-accent hover:underline">
              Full scoreboard →
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="data-table w-full text-[13px]">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Executive</th>
                  <th className="px-3 py-2 text-right">Leads</th>
                  <th className="px-3 py-2 text-right">Calls</th>
                  <th className="px-3 py-2 text-right">Won</th>
                  {data.seesMoney && <th className="px-4 py-2 text-right">Sales</th>}
                </tr>
              </thead>
              <tbody>
                {data.charts.employees.slice(0, 6).map((e) => (
                  <tr key={e.name}>
                    <td className="px-4 py-2 font-medium">{e.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.leads}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.calls}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.converted}</td>
                    {data.seesMoney && (
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatINRShort(e.sales)}
                      </td>
                    )}
                  </tr>
                ))}
                {data.charts.employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[color:var(--text-faint)]">
                      No leads assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
