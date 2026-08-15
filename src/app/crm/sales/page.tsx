"use client";

// Sales and payments. Only roles with money:view can reach this page at all —
// the API refuses everyone else, so a sales executive who types the URL gets
// the same answer as one who clicks a link that is not there.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/salescrm/Shell";
import { Kpi, formatINR, formatINRShort } from "@/components/salescrm/ui";
import { Invoice, Lead, PAY_METHODS, SERVICES } from "@/lib/leads/types";

const input =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-accent";

function tone(s: string): string {
  if (s === "Paid") return "bg-[color:var(--good-soft)] text-[color:var(--good)] ring-[#bfe3d2]";
  if (s === "Refunded" || s === "Cancelled")
    return "bg-[color:var(--crit-soft)] text-[color:var(--crit)] ring-[#f3c9c4]";
  if (s === "Partially Paid") return "bg-[color:var(--warn-soft)] text-[color:var(--warn)] ring-[#f0dcbb]";
  return "bg-surface-sunk text-[color:var(--text-muted)] ring-[color:var(--line)]";
}

export default function SalesPage() {
  const { permissions } = useCrm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [raising, setRaising] = useState(false);
  const [form, setForm] = useState({
    leadId: "", service: "Full Package", total: "", paid: "",
    method: "UPI", paidOn: new Date().toISOString().slice(0, 10), notes: "",
  });

  const load = useCallback(async () => {
    const [i, l] = await Promise.all([
      fetch("/api/crm/invoices").then((r) => r.json()),
      fetch("/api/crm/leads?limit=300").then((r) => r.json()),
    ]);
    if (i.error) setError(i.error);
    else setInvoices(Array.isArray(i.invoices) ? i.invoices : []);
    setLeads(Array.isArray(l.leads) ? l.leads : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const billed = invoices.filter((i) => i.status !== "Cancelled").reduce((n, i) => n + i.total, 0);
  const collected = invoices.reduce((n, i) => n + i.paid, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/crm/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        total: Number(form.total),
        paid: Number(form.paid || 0),
      }),
    }).then((x) => x.json());
    if (r.error) setError(r.error);
    else {
      setError("");
      setRaising(false);
      load();
    }
  }

  async function collect(inv: Invoice) {
    const amount = window.prompt(
      `Payment for ${inv.leadName} (${inv.number}).\nOutstanding: ${formatINR(inv.balance)}`,
      String(inv.balance)
    );
    if (!amount) return;
    const r = await fetch("/api/crm/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: inv.id,
        amount: Number(amount),
        method: "Cash",
        paidOn: new Date().toISOString().slice(0, 10),
      }),
    }).then((x) => x.json());
    if (r.error) setError(r.error);
    else load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Money</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">Sales & payments</h1>
        </div>
        {permissions.editsMoney && (
          <button
            onClick={() => setRaising(true)}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
          >
            + Raise invoice
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total invoiced" value={billed} format={formatINRShort} sub="all services" />
        <Kpi label="Collected" value={collected} format={formatINRShort} tone="good" sub="in the bank" />
        <Kpi label="Outstanding" value={Math.max(0, billed - collected)} format={formatINRShort} tone="crit" sub="still owed" />
        <Kpi label="Invoices" value={invoices.length} sub="raised" />
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="px-4 py-2.5 text-left">Invoice</th>
                <th className="px-3 py-2.5 text-left">Client</th>
                <th className="px-3 py-2.5 text-left">Service</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Paid</th>
                <th className="px-3 py-2.5 text-right">Balance</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-left">Executive</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5 font-medium tabular-nums">{i.number}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/crm/leads/${i.leadId}`} className="font-semibold hover:text-accent">
                      {i.leadName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{i.service}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(i.total)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatINR(i.paid)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                    {formatINR(i.balance)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${tone(i.status)}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[color:var(--text-muted)]">
                    {i.executive || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {permissions.editsMoney && i.balance > 0 && (
                      <button
                        onClick={() => collect(i)}
                        className="rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent"
                      >
                        Record payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[color:var(--text-faint)]">
                    Nothing invoiced yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {raising && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <form onSubmit={submit} className="my-10 w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="font-display text-lg font-bold">Raise an invoice</h2>
            <p className="text-[13px] text-[color:var(--text-muted)]">
              Clearing it in full converts the lead.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Client *</span>
                <select required className={input} value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
                  <option value="">Pick a lead…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Service</span>
                <select className={input} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                  {SERVICES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Total (₹) *</span>
                  <input required type="number" min={1} className={input} value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Paid now (₹)</span>
                  <input type="number" min={0} className={input} value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Method</span>
                  <select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    {PAY_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Paid on</span>
                  <input type="date" className={input} value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setRaising(false)} className="rounded-xl border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-[color:var(--text-muted)]">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-accent px-5 py-2 text-[13.5px] font-semibold text-white">
                Raise invoice
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
