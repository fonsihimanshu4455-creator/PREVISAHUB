"use client";

import { useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/crm-data";

type Fee = {
  studentId: string;
  studentName: string;
  counsellor: string;
  country: string;
  stage: string;
  totalFee: number;
  paid: number;
  pending: number;
};
type Payment = {
  id: string;
  studentId: string;
  studentName: string;
  counsellor: string;
  amount: number;
  method: string;
  purpose: string;
  paidOn: string;
  note: string;
};
type Student = { id: string; name: string; counsellor: string; stage: string };

export default function SalesPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "dues" | "payments">("overview");

  async function load() {
    setLoading(true);
    try {
      const d = await fetch("/api/reports").then((r) => r.json());
      if (d.error) setError(d.detail || d.error);
      else {
        setFees(d.fees ?? []);
        setPayments(d.payments ?? []);
        setStudents(d.students ?? []);
      }
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const billed = fees.reduce((a, f) => a + f.totalFee, 0);
    const collected = payments.reduce((a, p) => a + p.amount, 0);
    const pending = fees.reduce((a, f) => a + f.pending, 0);
    const approved = students.filter((s) => s.stage === "Approved").length;
    const closed = students.filter((s) =>
      ["Approved", "Rejected"].includes(s.stage)
    ).length;
    return {
      billed,
      collected,
      pending,
      approved,
      // Of the cases that reached a decision, how many were approved.
      successRate: closed ? Math.round((approved / closed) * 100) : 0,
      collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
    };
  }, [fees, payments, students]);

  // Revenue per month, most recent last.
  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      const key = p.paidOn.slice(0, 7);
      m.set(key, (m.get(key) ?? 0) + p.amount);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [payments]);

  const byCounsellor = useMemo(() => {
    const m = new Map<string, { collected: number; pending: number; students: number }>();
    for (const f of fees) {
      const k = f.counsellor || "Unassigned";
      const e = m.get(k) ?? { collected: 0, pending: 0, students: 0 };
      e.pending += f.pending;
      e.students += 1;
      m.set(k, e);
    }
    for (const p of payments) {
      const k = p.counsellor || "Unassigned";
      const e = m.get(k) ?? { collected: 0, pending: 0, students: 0 };
      e.collected += p.amount;
      m.set(k, e);
    }
    return [...m.entries()].sort((a, b) => b[1].collected - a[1].collected);
  }, [fees, payments]);

  const dues = useMemo(
    () => fees.filter((f) => f.pending > 0).sort((a, b) => b.pending - a.pending),
    [fees]
  );

  const maxMonth = Math.max(1, ...byMonth.map(([, v]) => v));

  if (loading) {
    return <div className="py-16 text-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">
          Sales &amp; Payments 💰
        </h1>
        <p className="mt-1 text-slate-500">
          Fees billed, money collected and what is still outstanding.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Collected" value={formatINR(totals.collected)} tone="text-green-600" sub={`${totals.collectionRate}% of billed`} />
        <Kpi label="Pending" value={formatINR(totals.pending)} tone="text-red-600" sub={`${dues.length} students owe`} />
        <Kpi label="Total Billed" value={formatINR(totals.billed)} tone="text-slate-800" sub={`${fees.length} students`} />
        <Kpi label="Visa Success" value={`${totals.successRate}%`} tone="text-violet-600" sub={`${totals.approved} approved`} />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-px">
        {([
          ["overview", "Overview"],
          ["dues", `Pending Dues (${dues.length})`],
          ["payments", `All Payments (${payments.length})`],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === k
                ? "border-b-2 border-orange-500 text-orange-600"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-display font-bold text-slate-800">
              Revenue by Month
            </h3>
            {byMonth.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                No payments recorded yet.
              </p>
            )}
            <div className="space-y-3">
              {byMonth.map(([month, amount]) => (
                <div key={month} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium text-slate-600">
                    {new Date(month + "-01T00:00:00Z").toLocaleDateString("en-GB", {
                      month: "short",
                      year: "2-digit",
                      timeZone: "UTC",
                    })}
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-green-500 to-green-600 px-2 text-[11px] font-bold text-white"
                      style={{ width: `${Math.max(8, (amount / maxMonth) * 100)}%` }}
                    >
                      {formatINR(amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-display font-bold text-slate-800">
              By Counsellor
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 font-semibold">Counsellor</th>
                    <th className="pb-2 text-right font-semibold">Students</th>
                    <th className="pb-2 text-right font-semibold">Collected</th>
                    <th className="pb-2 text-right font-semibold">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byCounsellor.map(([name, v]) => (
                    <tr key={name}>
                      <td className="py-2 font-semibold text-slate-700">{name}</td>
                      <td className="py-2 text-right text-slate-500">{v.students}</td>
                      <td className="py-2 text-right font-semibold text-green-600">
                        {formatINR(v.collected)}
                      </td>
                      <td className="py-2 text-right text-red-600">
                        {formatINR(v.pending)}
                      </td>
                    </tr>
                  ))}
                  {byCounsellor.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                        No data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "dues" && (
        <Table
          head={["Student", "Counsellor", "Total Fee", "Paid", "Pending"]}
          empty="Nothing outstanding — everyone has paid in full 🎉"
          rows={dues.map((f) => [
            <span key="n" className="font-semibold text-slate-800">{f.studentName}</span>,
            f.counsellor,
            formatINR(f.totalFee),
            <span key="p" className="text-green-600">{formatINR(f.paid)}</span>,
            <span key="d" className="font-bold text-red-600">{formatINR(f.pending)}</span>,
          ])}
        />
      )}

      {tab === "payments" && (
        <Table
          head={["Date", "Student", "Purpose", "Method", "Amount"]}
          empty="No payments recorded yet. Add them from a student's Payments tab in the CRM."
          rows={payments.map((p) => [
            p.paidOn,
            <span key="n" className="font-semibold text-slate-800">{p.studentName}</span>,
            p.purpose,
            p.method,
            <span key="a" className="font-bold text-green-600">{formatINR(p.amount)}</span>,
          ])}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {head.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-orange-50/40">
                {r.map((c, j) => (
                  <td key={j} className="whitespace-nowrap px-4 py-3">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={head.length} className="px-4 py-10 text-center text-sm text-slate-400">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
