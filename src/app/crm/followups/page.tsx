"use client";

// The five follow-up queues. Overdue is never collapsed or truncated —
// business rule 4 says no overdue follow-up may be hidden.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FollowUp, Queue } from "@/lib/leads/followups";

const QUEUES: { key: Queue; label: string; tone: string }[] = [
  { key: "overdue", label: "Overdue", tone: "bg-[color:var(--crit)]" },
  { key: "today", label: "Today", tone: "bg-[color:var(--warn)]" },
  { key: "tomorrow", label: "Tomorrow", tone: "bg-[color:var(--info)]" },
  { key: "upcoming", label: "Upcoming", tone: "bg-[color:var(--info)]" },
  { key: "missed", label: "Missed", tone: "bg-[color:var(--text-faint)]" },
];

function FollowUpsInner() {
  const params = useSearchParams();
  const initial = (params.get("queue") ?? "today") as Queue;
  const [queue, setQueue] = useState<Queue>(
    QUEUES.some((q) => q.key === initial) ? initial : "today"
  );
  const [items, setItems] = useState<FollowUp[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    const r = await fetch(`/api/crm/followups?queue=${queue}`).then((x) => x.json());
    setItems(Array.isArray(r.items) ? r.items : []);
    setCounts(r.counts ?? {});
    setBusy(false);
  }, [queue]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Follow-ups</p>
        <h1 className="mt-1 font-display text-display-lg font-bold">What is due</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
          The CRM schedules these — day 0, 1, 3, 6, 10, 15 and 30 after the lead
          arrives, and again after every call.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUEUES.map((q) => (
          <button
            key={q.key}
            onClick={() => setQueue(q.key)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 transition ${
              queue === q.key
                ? "bg-[color:var(--ink-800)] text-white ring-[color:var(--ink-800)]"
                : "bg-surface text-[color:var(--text-muted)] ring-[color:var(--line)] hover:text-[color:var(--text)]"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${q.tone}`} />
            {q.label}
            <span className="tabular-nums opacity-70">{counts[q.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="px-4 py-2.5 text-left">Client</th>
                <th className="px-3 py-2.5 text-left">Due</th>
                <th className="px-3 py-2.5 text-left">What for</th>
                <th className="px-3 py-2.5 text-left">Owner</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/crm/leads/${f.leadId}`} className="font-semibold hover:text-accent">
                      {f.leadName}
                    </Link>
                    <div className="text-[11.5px] text-[color:var(--text-faint)]">{f.phone}</div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {f.dueDate} {f.dueTime}
                  </td>
                  <td className="px-3 py-2.5 text-[color:var(--text-muted)]">
                    {f.note || f.kind}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[color:var(--text-muted)]">
                    {f.owner || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/crm/leads/${f.leadId}`}
                      className="rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !busy && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[color:var(--text-faint)]">
                    Nothing in this queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-[12px] text-[color:var(--text-faint)]">
          {busy ? "Loading…" : `${items.length} follow-up${items.length === 1 ? "" : "s"}`}
        </div>
      </div>
    </div>
  );
}

export default function FollowUpsPage() {
  return (
    <Suspense fallback={<div className="panel p-5 text-sm">Loading…</div>}>
      <FollowUpsInner />
    </Suspense>
  );
}
