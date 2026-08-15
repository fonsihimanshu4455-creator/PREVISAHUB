"use client";

// The Kanban board. Cards are dragged between columns; the drop is a status
// change, which goes through the same API — and therefore the same rules and
// the same timeline entry — as changing it from the profile page.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/salescrm/Shell";
import { ScorePill, statusFill } from "@/components/salescrm/ui";
import {
  CLOSED_STATUSES, LOST_REASONS, Lead, LeadStatus, OPEN_STATUSES, REASON_REQUIRED,
} from "@/lib/leads/types";

export default function PipelinePage() {
  const { permissions } = useCrm();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const r = await fetch("/api/crm/leads?limit=500").then((x) => x.json());
    setLeads(Array.isArray(r.leads) ? r.leads : []);
    setBusy(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function move(id: string, status: LeadStatus) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;

    let lostReason = "";
    if (REASON_REQUIRED.includes(status)) {
      const r = window.prompt(
        `Why is this lead ${status}?\n\n${LOST_REASONS.join(" · ")}`,
        "No Response"
      );
      if (!r) return;
      lostReason = r;
    }

    // Optimistic: the card moves now, and snaps back if the server refuses.
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch(`/api/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(lostReason ? { lostReason } : {}) }),
    }).then((x) => x.json());
    if (res.error) {
      setError(res.error);
      load();
    } else {
      setError("");
      setLeads((prev) => prev.map((l) => (l.id === id ? res.lead : l)));
    }
  }

  const columns = showClosed ? CLOSED_STATUSES : OPEN_STATUSES;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Sales pipeline</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">Board</h1>
          <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
            {permissions.canEdit
              ? "Drag a card to move the lead. Closing one asks for a reason."
              : "Read-only — your role cannot move leads."}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-line-strong p-1">
          <button
            onClick={() => setShowClosed(false)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
              !showClosed ? "bg-[color:var(--ink-800)] text-white" : "text-[color:var(--text-muted)]"
            }`}
          >
            Working
          </button>
          <button
            onClick={() => setShowClosed(true)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
              showClosed ? "bg-[color:var(--ink-800)] text-white" : "text-[color:var(--text-muted)]"
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
          {error}
        </p>
      )}

      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3" style={{ minWidth: `${columns.length * 244}px` }}>
          {columns.map((status) => {
            const cards = leads.filter((l) => l.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  if (!permissions.canEdit) return;
                  e.preventDefault();
                  setOver(status);
                }}
                onDragLeave={() => setOver((s) => (s === status ? null : s))}
                onDrop={() => {
                  setOver(null);
                  if (dragging) move(dragging, status as LeadStatus);
                  setDragging(null);
                }}
                className={`w-60 shrink-0 rounded-xl border p-2 transition ${
                  over === status
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface-sunk"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: statusFill(status as LeadStatus) }}
                  />
                  <span className="flex-1 text-[12px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                    {status}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums text-[color:var(--text-faint)]">
                    {cards.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {cards.map((l) => (
                    <div
                      key={l.id}
                      draggable={permissions.canEdit}
                      onDragStart={() => setDragging(l.id)}
                      onDragEnd={() => setDragging(null)}
                      className={`rounded-lg border border-line bg-surface p-2.5 shadow-sm transition ${
                        permissions.canEdit ? "cursor-grab active:cursor-grabbing" : ""
                      } ${dragging === l.id ? "opacity-50" : ""}`}
                    >
                      <Link
                        href={`/crm/leads/${l.id}`}
                        className="text-[13px] font-semibold hover:text-accent"
                      >
                        {l.name}
                      </Link>
                      <div className="mt-0.5 text-[11px] text-[color:var(--text-faint)]">
                        {l.destination} · {l.visaType}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <ScorePill score={l.score} priority={l.priority} size="sm" />
                        <span className="text-[10.5px] text-[color:var(--text-faint)]">
                          {l.owner.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <p className="py-6 text-center text-[12px] text-[color:var(--text-faint)]">
                      {busy ? "…" : "Empty"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
