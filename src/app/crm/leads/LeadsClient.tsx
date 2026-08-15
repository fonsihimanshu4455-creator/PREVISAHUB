"use client";

// The lead list. Search and every filter run in SQL; the browser holds one
// page, never the whole book.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCrm } from "@/components/salescrm/Shell";
import LeadForm from "@/components/salescrm/LeadForm";
import EditLeadModal from "@/components/salescrm/EditLeadModal";
import { ScorePill, StatusBadge, dueTone, statusChip } from "@/components/salescrm/ui";
import {
  DESTINATIONS, LEAD_SOURCES, LEAD_STATUSES, LOST_REASONS, Lead, PRIORITIES,
  REASON_REQUIRED, VISA_TYPES,
} from "@/lib/leads/types";

const PAGE = 50;

function LeadsInner({ initial }: { initial: { leads: Lead[]; total: number } }) {
  const { permissions, team } = useCrm();
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
  const [leads, setLeads] = useState<Lead[]>(initial.leads);
  const [total, setTotal] = useState(initial.total);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [assignTo, setAssignTo] = useState("");
  const [assignStatus, setAssignStatus] = useState("New Lead");
  const [assignAll, setAssignAll] = useState(false);
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
    // A selection that outlived the rows it referred to would assign the wrong
    // people, so it is dropped whenever the list is refetched.
    setPicked(new Set());
    setAssignAll(false);
    setBusy(false);
  }, [q, filters, page]);

  // The server already sent the first page, so this only runs when a filter or
  // the search box actually changes. Debounced — it would otherwise fire on
  // every keystroke.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  /** Replace one lead in the list without refetching the page. */
  const replace = (updated: Lead) =>
    setLeads((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

  /**
   * Change a status straight from the row. Closing a lead needs a reason, so
   * that is asked for here rather than bounced back from the server.
   */
  async function changeStatus(lead: Lead, status: string) {
    const body: Record<string, unknown> = { status };
    if (REASON_REQUIRED.includes(status as never)) {
      const reason = window.prompt(
        `Why is ${lead.name} ${status}?\n\n${LOST_REASONS.join(" · ")}`,
        lead.lostReason || "No Response"
      );
      if (!reason) return;
      body.lostReason = reason;
    }
    setSaving(lead.id);
    setRowError("");
    const r = await fetch(`/api/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    setSaving(null);
    if (r.error) setRowError(r.error);
    else replace(r.lead);
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAssignAll(false);
  }

  /**
   * Hand the selected leads to somebody. Sends ids normally; when the whole
   * filtered set is chosen it sends the filter instead, so the server assigns
   * all of them rather than only the page on screen.
   */
  async function assign() {
    const count = assignAll ? total : picked.size;
    if (!assignTo && !assignStatus) return;
    if (
      !window.confirm(
        `Assign ${count} lead${count === 1 ? "" : "s"}` +
          (assignTo ? ` to ${assignTo}` : "") +
          (assignStatus ? `, and set the status to ${assignStatus}` : "") +
          "?"
      )
    ) {
      return;
    }
    setSaving("bulk");
    setRowError("");
    const body = assignAll
      ? { filter: { q: q.trim(), ...filters }, owner: assignTo, status: assignStatus }
      : { ids: [...picked], owner: assignTo, status: assignStatus };
    const r = await fetch("/api/crm/leads/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    setSaving(null);
    if (r.error) setRowError(r.error);
    else {
      setPicked(new Set());
      setAssignAll(false);
      load();
    }
  }

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

      {permissions.canAssign && picked.size > 0 && (
        <div className="sticky top-[52px] z-20 flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3">
          <span className="text-[13px] font-semibold">
            {assignAll ? total : picked.size} selected
          </span>
          {!assignAll && total > leads.length && picked.size === leads.length && (
            <button
              onClick={() => setAssignAll(true)}
              className="text-[12.5px] font-semibold text-accent hover:underline"
            >
              Select all {total} matching this filter
            </button>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px]"
            >
              <option value="">Assign to…</option>
              {team.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={assignStatus}
              onChange={(e) => setAssignStatus(e.target.value)}
              title="Cold leads are not in anyone's call queue. Moving them to New Lead puts them there."
              className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px]"
            >
              <option value="">Leave the status alone</option>
              {LEAD_STATUSES.filter((s) => !REASON_REQUIRED.includes(s)).map((s) => (
                <option key={s} value={s}>
                  Set status: {s}
                </option>
              ))}
            </select>
            <button
              onClick={assign}
              disabled={saving === "bulk" || (!assignTo && !assignStatus)}
              className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
            >
              {saving === "bulk" ? "Assigning…" : "Send to caller"}
            </button>
            <button
              onClick={() => {
                setPicked(new Set());
                setAssignAll(false);
              }}
              className="btn-ghost text-[13px]"
            >
              Clear
            </button>
          </span>
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-[13.5px]">
            <thead>
              <tr>
                {permissions.canAssign && (
                  <th className="w-9 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select every lead on this page"
                      checked={leads.length > 0 && picked.size === leads.length}
                      onChange={(e) => {
                        setPicked(
                          e.target.checked ? new Set(leads.map((l) => l.id)) : new Set()
                        );
                        setAssignAll(false);
                      }}
                    />
                  </th>
                )}
                <th className="px-4 py-2.5 text-left">Client</th>
                <th className="px-3 py-2.5 text-left">Mobile</th>
                <th className="px-3 py-2.5 text-left">Destination / Visa</th>
                <th className="px-3 py-2.5 text-left">Source</th>
                <th className="px-3 py-2.5 text-left" title="Built from eligibility, budget and how soon they want to apply. A lead imported from an old sheet has none of that yet, so it is unscored until someone fills it in.">
                  Score
                </th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-left">Next follow-up</th>
                <th className="px-3 py-2.5 text-left">Owner</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className={`transition hover:bg-accent/[0.04] ${
                    picked.has(l.id) ? "bg-accent/[0.06]" : ""
                  }`}
                >
                  {permissions.canAssign && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${l.name}`}
                        checked={picked.has(l.id)}
                        onChange={() => togglePick(l.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <Link href={`/crm/leads/${l.id}`} className="font-semibold hover:text-accent">
                      {l.name}
                    </Link>
                    <div className="text-[11.5px] text-[color:var(--text-faint)]">{l.id}</div>
                  </td>
                  {/* Its own column: the number is what a caller reaches for. */}
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <a
                      href={`tel:${l.phone.replace(/[^0-9+]/g, "")}`}
                      className="font-medium tabular-nums hover:text-accent"
                    >
                      {l.phone}
                    </a>
                    <a
                      href={`https://wa.me/${(l.whatsapp || l.phone).replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-[11.5px] font-semibold text-[#0f7a52] hover:underline"
                    >
                      WhatsApp
                    </a>
                  </td>
                  <td className="px-3 py-2.5">
                    {l.destination || "—"}
                    <div className="text-[11.5px] text-[color:var(--text-faint)]">{l.visaType}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[color:var(--text-muted)]">{l.source}</td>
                  <td className="px-3 py-2.5">
                    {/* "Cold 0" on every row of an imported sheet says nothing.
                        Until there is something to score, say so instead. */}
                    {l.score > 0 ? (
                      <ScorePill score={l.score} priority={l.priority} size="sm" />
                    ) : (
                      <span
                        className="text-[11.5px] text-[color:var(--text-faint)]"
                        title="Nothing to score yet — add education, budget or an application date and it fills in."
                      >
                        Not scored
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {permissions.canEdit ? (
                      <select
                        value={l.status}
                        disabled={saving === l.id}
                        onChange={(e) => changeStatus(l, e.target.value)}
                        className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 outline-none transition disabled:opacity-50 ${statusChip(
                          l.status
                        )}`}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={l.status} />
                    )}
                  </td>
                  <td className={`px-3 py-2.5 tabular-nums ${dueTone(l.nextFollowUpDate, today)}`}>
                    {l.nextFollowUpDate || "—"}
                    {l.nextFollowUpTime ? ` ${l.nextFollowUpTime}` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[color:var(--text-muted)]">
                    {l.owner || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {permissions.canEdit && (
                      <button
                        onClick={() => setEditing(l)}
                        className="rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !busy && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[color:var(--text-faint)]">
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

      {rowError && (
        <p className="rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
          {rowError}
        </p>
      )}

      {editing && (
        <EditLeadModal
          lead={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replace(updated);
            setEditing(null);
          }}
        />
      )}

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

export default function LeadsClient({
  initial,
}: {
  initial: { leads: Lead[]; total: number };
}) {
  return (
    <Suspense fallback={<div className="panel p-5 text-sm">Loading…</div>}>
      <LeadsInner initial={initial} />
    </Suspense>
  );
}
