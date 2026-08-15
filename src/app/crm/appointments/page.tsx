"use client";

// The consultation diary. Booking one moves the lead to Consultation Booked;
// marking it Completed moves it on again — that pair is what the show-up rate
// is built from, so it happens here rather than by hand.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/salescrm/Shell";
import {
  APPOINTMENT_KINDS, APPOINTMENT_STATUSES, Appointment, Lead,
} from "@/lib/leads/types";

const input =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-accent";

function statusTone(s: string): string {
  if (s === "Completed") return "bg-[color:var(--good-soft)] text-[color:var(--good)] ring-[#bfe3d2]";
  if (s === "No Show" || s === "Cancelled")
    return "bg-[color:var(--crit-soft)] text-[color:var(--crit)] ring-[#f3c9c4]";
  if (s === "Confirmed") return "bg-[#e8f0fb] text-[#1b5aa8] ring-[#c8ddf5]";
  return "bg-[color:var(--warn-soft)] text-[color:var(--warn)] ring-[#f0dcbb]";
}

function AppointmentsInner() {
  const { user, team, permissions } = useCrm();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    leadId: "", consultant: user.name, date: "", time: "11:00",
    kind: "In-office", notes: "",
  });
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const [a, l] = await Promise.all([
      fetch("/api/crm/appointments").then((r) => r.json()),
      fetch("/api/crm/leads?bucket=open&limit=300").then((r) => r.json()),
    ]);
    setRows(Array.isArray(a.appointments) ? a.appointments : []);
    setLeads(Array.isArray(l.leads) ? l.leads : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/crm/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((x) => x.json());
    if (r.error) setError(r.error);
    else {
      setError("");
      setBooking(false);
      load();
    }
  }

  async function setStatus(id: string, status: string) {
    const r = await fetch("/api/crm/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).then((x) => x.json());
    if (r.error) setError(r.error);
    else load();
  }

  const upcoming = rows.filter((r) => r.date >= today);
  const past = rows.filter((r) => r.date < today);

  const table = (list: Appointment[], title: string) => (
    <div className="panel overflow-hidden">
      <h2 className="px-4 pt-4 font-display text-[14px] font-bold">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="data-table w-full text-[13.5px]">
          <thead>
            <tr>
              <th className="px-4 py-2.5 text-left">When</th>
              <th className="px-3 py-2.5 text-left">Client</th>
              <th className="px-3 py-2.5 text-left">Consultant</th>
              <th className="px-3 py-2.5 text-left">Type</th>
              <th className="px-3 py-2.5 text-left">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5 tabular-nums">
                  {a.date} {a.time}
                  {a.date === today && (
                    <span className="ml-2 rounded-full bg-[color:var(--warn-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[color:var(--warn)]">
                      today
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/crm/leads/${a.leadId}`} className="font-semibold hover:text-accent">
                    {a.leadName}
                  </Link>
                  <div className="text-[11.5px] text-[color:var(--text-faint)]">{a.phone}</div>
                </td>
                <td className="px-3 py-2.5">{a.consultant}</td>
                <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{a.kind}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${statusTone(a.status)}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {permissions.canBook && (
                    <select
                      value={a.status}
                      onChange={(e) => setStatus(a.id, e.target.value)}
                      className="rounded-lg border border-line-strong bg-surface-sunk px-2 py-1 text-[12px]"
                    >
                      {APPOINTMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[color:var(--text-faint)]">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Consultations</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">Appointments</h1>
        </div>
        {permissions.canBook && (
          <button
            onClick={() => setBooking(true)}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
          >
            + Book consultation
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
          {error}
        </p>
      )}

      {table(upcoming, "Upcoming")}
      {table(past, "Past")}

      {booking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <form onSubmit={book} className="my-10 w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="font-display text-lg font-bold">Book a consultation</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Client *</span>
                <select
                  required
                  className={input}
                  value={form.leadId}
                  onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                >
                  <option value="">Pick a lead…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.phone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Consultant *</span>
                <select
                  className={input}
                  value={form.consultant}
                  onChange={(e) => setForm({ ...form, consultant: e.target.value })}
                >
                  <option>{user.name}</option>
                  {team.filter((t) => t.name !== user.name).map((t) => (
                    <option key={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Date *</span>
                  <input required type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Time</span>
                  <input type="time" className={input} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Type</span>
                <select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {APPOINTMENT_KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">Notes</span>
                <input className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setBooking(false)} className="rounded-xl border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-[color:var(--text-muted)]">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-accent px-5 py-2 text-[13.5px] font-semibold text-white">
                Book
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="panel p-5 text-sm">Loading…</div>}>
      <AppointmentsInner />
    </Suspense>
  );
}
