"use client";

// The lead list. Search and every filter run in SQL; the browser holds one
// page, never the whole book.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCrm } from "@/components/salescrm/Shell";
import LeadForm from "@/components/salescrm/LeadForm";
import { ScorePill, StatusBadge, dueTone } from "@/components/salescrm/ui";
import {
  DESTINATIONS, LEAD_SOURCES, LEAD_STATUSES, Lead, PRIORITIES, VISA_TYPES,
} from "@/lib/leads/types";

const PAGE = 50;

function LeadsInner() {
  const { permissions } = useCrm();
  const params = useSearchParams();
  const router = useRouter();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState({
    status: params.get("status") ?? "",
    bucket: params.get("bucket") ?? "",
    source: params.get("source") ?? "",
    destination: params.get("destination") ?? "",
    visaType: params.get("visaType") ?? "",
    priority: params.get("priority") ?? "",
    due: params.get("due") ?? "",
  });
  const [page, setPage] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [adding, setAdding] = useState(params.get("new") === "1");
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setBusy(true);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
    p.set("limit", String(PAGE));
    p.set("offset", String(page * PAGE));
    const r = await fetch(`/api/crm/leads?${p}`).then((x) => x.json());
    setLeads(Array.isArray(r.leads) ? r.leads : []);
    setTotal(r.total ?? 0);
    setBusy(false);
  }, [q, filters, page]);

  // Debounced so it does not fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (k: string, v: string) => {
    setPage(0);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const chips = Object.entries(filters).filter(([, v]) => v);
  const select =
    "rounded-xl border border-line-strong bg-surface-sunk px-2.5 py-2 text-[13px] outline-none focus:border-accent";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">Leads</h1>
        </div>
        {permissions.canEdit && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
          >
            + Add lead
          </button>
        )}
      </div>

      <div className="panel flex flex-wrap gap-2 p-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
          placeholder="Search name, phone, email, lead ID…"
          className="min-w-[220px] flex-1 rounded-xl border border-line-strong bg-surface-sunk px-3.5 py-2 text-[13.5px] outline-none transition focus:border-accent focus:bg-white"
        />
        <select className={select} value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={select} value={filters.source} onChange={(e) => setFilter("source", e.target.value)}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={select} value={filters.destination} onChange={(e) => setFilter("destination", e.target.value)}>
          <option value="">All destinations</option>
          {DESTINATIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={select} value={filters.visaType} onChange={(e) => setFilter("visaType", e.target.value)}>
          <option value="">All visa types</option>
          {VISA_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={select} value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)}>
          <option value="">Any score</option>
          {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={select} value={filters.due} onChange={(e) => setFilter("due", e.target.value)}>
          <option value="">Any follow-up</option>
          <option value="today">Due today</option>
          <option value="overdue">Overdue</option>
          <option value="uncontacted">Never contacted</option>
        </select>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-[color:var(--text-muted)]">Filtered by</span>
          {chips.map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilter(k, "")}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk px-3 py-1 text-[12px] font-semibold text-[color:var(--text-muted)] ring-1 ring-[color:var(--line)] transition hover:text-[color:var(--text)]"
            >
              {v} <span aria-hidden>✕</span>
            </button>
          ))}
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="px-4 py-2.5 text-left">Client</th>
                <th className="px-3 py-2.5 text-left">Destination / Visa</th>
                <th className="px-3 py-2.5 text-left">Source</th>
                <th className="px-3 py-2.5 text-left">Score</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-left">Next follow-up</th>
                <th className="px-3 py-2.5 text-left">Owner</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="transition hover:bg-accent/[0.04]">
                  <td className="px-4 py-2.5">
                    <Link href={`/crm/leads/${l.id}`} className="font-semibold hover:text-accent">
                      {l.name}
                    </Link>
                    <div className="text-[11.5px] text-[color:var(--text-faint)]">
                      {l.id} · {l.phone}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {l.destination}
                    <div className="text-[11.5px] text-[color:var(--text-faint)]">{l.visaType}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{l.source}</td>
                  <td className="px-3 py-2.5">
                    <ScorePill score={l.score} priority={l.priority} size="sm" />
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                  <td className={`px-3 py-2.5 tabular-nums ${dueTone(l.nextFollowUpDate, today)}`}>
                    {l.nextFollowUpDate || "—"}
                    {l.nextFollowUpTime ? ` ${l.nextFollowUpTime}` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[color:var(--text-muted)]">
                    {l.owner || "—"}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !busy && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[color:var(--text-faint)]">
                    {total === 0 && !q && chips.length === 0
                      ? "No leads yet — add the first one."
                      : "No leads match those filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[12px] text-[color:var(--text-faint)]">
          <span>
            {busy
              ? "Searching…"
              : `${page * PAGE + 1}–${Math.min(total, page * PAGE + leads.length)} of ${total}`}
          </span>
          <span className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="btn-ghost disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              disabled={(page + 1) * PAGE >= total}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost disabled:opacity-40"
            >
              Next →
            </button>
          </span>
        </div>
      </div>

      {adding && (
        <LeadForm
          onClose={() => {
            setAdding(false);
            router.replace("/crm/leads");
          }}
          onSaved={() => {
            setAdding(false);
            router.replace("/crm/leads");
            load();
          }}
        />
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="panel p-5 text-sm">Loading…</div>}>
      <LeadsInner />
    </Suspense>
  );
}
