"use client";

// Reports. One date range drives every figure on the page, and the same
// aggregates the dashboard uses — so a monthly report and the live dashboard
// can never quote different numbers for the same window.

import { useCallback, useEffect, useState } from "react";
import { useCrm } from "@/components/salescrm/Shell";
import { BarList, Kpi, formatINR, formatINRShort } from "@/components/salescrm/ui";
import type { Charts, Kpis } from "@/lib/leads/stats";

function monthStart(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const PRESETS: { label: string; from: () => string; to: () => string }[] = [
  { label: "Today", from: () => new Date().toISOString().slice(0, 10), to: () => new Date().toISOString().slice(0, 10) },
  {
    label: "Last 7 days",
    from: () => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    to: () => new Date().toISOString().slice(0, 10),
  },
  { label: "This month", from: monthStart, to: () => new Date().toISOString().slice(0, 10) },
  { label: "All time", from: () => "", to: () => "" },
];

export default function ReportsPage() {
  const { permissions } = useCrm();
  const [range, setRange] = useState({ from: monthStart(), to: new Date().toISOString().slice(0, 10) });
  const [data, setData] = useState<{ kpis: Kpis; charts: Charts; seesMoney: boolean } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (range.from) p.set("from", range.from);
    if (range.to) p.set("to", range.to);
    const r = await fetch(`/api/crm/stats?${p}`).then((x) => x.json());
    if (r.error) setError(r.error);
    else {
      setError("");
      setData(r);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const dateInput =
    "rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent";

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Reporting</p>
        <h1 className="mt-1 font-display text-display-lg font-bold">Reports</h1>
      </div>

      <div className="panel flex flex-wrap items-center gap-2 p-3">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setRange({ from: p.from(), to: p.to() })}
            className="rounded-xl border border-line-strong px-3 py-1.5 text-[12.5px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent"
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2 text-[12.5px] text-[color:var(--text-muted)]">
          From
          <input type="date" className={dateInput} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          to
          <input type="date" className={dateInput} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </span>
      </div>

      {error && (
        <p className="rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
          {error}
        </p>
      )}
      {!data ? (
        <div className="panel p-5 text-sm text-[color:var(--text-faint)]">Loading…</div>
      ) : (
        <>
          <section>
            <h2 className="eyebrow mb-2">Calling report</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <Kpi label="Leads" value={data.kpis.totalLeads} />
              <Kpi label="Calls made" value={data.kpis.callsMade} />
              <Kpi label="Connected" value={data.kpis.connectedCalls} />
              <Kpi label="Contact rate" value={data.kpis.contactRate} format={(n) => `${n}%`} tone="info" />
              <Kpi label="Follow-ups done" value={data.kpis.followUpCompletionRate} format={(n) => `${n}%`} tone="good" />
              <Kpi label="Missed follow-ups" value={data.kpis.missedFollowUps} tone="crit" />
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-2">Conversion report</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <Kpi label="Qualified" value={data.kpis.qualifiedLeads} />
              <Kpi label="Qualification rate" value={data.kpis.qualificationRate} format={(n) => `${n}%`} />
              <Kpi label="Appointments" value={data.kpis.appointments} />
              <Kpi label="Show-up rate" value={data.kpis.showUpRate} format={(n) => `${n}%`} />
              <Kpi label="Converted" value={data.kpis.converted} tone="good" />
              <Kpi label="Conversion rate" value={data.kpis.conversionRate} format={(n) => `${n}%`} tone="good" />
            </div>
          </section>

          {data.seesMoney && (
            <section>
              <h2 className="eyebrow mb-2">Sales report</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label="Total sales" value={data.kpis.totalSales} format={formatINRShort} tone="good" />
                <Kpi label="Collected" value={data.kpis.collected} format={formatINRShort} tone="good" />
                <Kpi label="Outstanding" value={data.kpis.outstanding} format={formatINRShort} tone="crit" />
                <Kpi label="Revenue per lead" value={data.kpis.revenuePerLead} format={formatINR} />
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Lead source performance" rows={data.charts.bySource} />
            <BarList title="Country performance" rows={data.charts.byDestination} colour="var(--info)" />
            <BarList title="Visa type performance" rows={data.charts.byVisaType} colour="#4a72b0" />
            <BarList title="Lost lead reasons" rows={data.charts.lostReasons} colour="var(--crit)" empty="No lost leads in this range." />
          </div>

          {permissions.seesEveryone && (
            <div className="panel overflow-hidden">
              <h2 className="px-4 pt-4 font-display text-[14px] font-bold">Employee performance</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="data-table w-full text-[13px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-2.5 text-left">Executive</th>
                      <th className="px-3 py-2.5 text-right">Leads</th>
                      <th className="px-3 py-2.5 text-right">Calls</th>
                      <th className="px-3 py-2.5 text-right">Connected</th>
                      <th className="px-3 py-2.5 text-right">Qualified</th>
                      <th className="px-3 py-2.5 text-right">Appts</th>
                      <th className="px-3 py-2.5 text-right">Won</th>
                      <th className="px-3 py-2.5 text-right">Conv %</th>
                      <th className="px-3 py-2.5 text-right">Missed</th>
                      {data.seesMoney && <th className="px-4 py-2.5 text-right">Sales</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.employees.map((e) => (
                      <tr key={e.name}>
                        <td className="px-4 py-2.5 font-medium">{e.name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.leads}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.calls}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.connected}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.qualified}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.appointments}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.converted}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{e.conversionRate}%</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[color:var(--crit)]">
                          {e.missedFollowUps}
                        </td>
                        {data.seesMoney && (
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatINRShort(e.sales)}</td>
                        )}
                      </tr>
                    ))}
                    {data.charts.employees.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-[color:var(--text-faint)]">
                          No leads assigned yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
