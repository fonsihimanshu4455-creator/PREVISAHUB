"use client";

// The calling floor. One list, worked top to bottom: overdue first, then due
// today, then leads nobody has ever rung.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/salescrm/Shell";
import CallModal from "@/components/salescrm/CallModal";
import { ScorePill, StatusBadge, dueTone } from "@/components/salescrm/ui";
import { Lead } from "@/lib/leads/types";

type Tab = "overdue" | "today" | "uncontacted" | "all";

const TABS: { key: Tab; label: string; due: string; bucket: string }[] = [
  { key: "overdue", label: "Overdue", due: "overdue", bucket: "open" },
  { key: "today", label: "Due today", due: "today", bucket: "open" },
  { key: "uncontacted", label: "Never called", due: "uncontacted", bucket: "open" },
  { key: "all", label: "All open", due: "", bucket: "open" },
];

function CallingInner({ initial }: { initial: { tab: Tab; leads: Lead[]; counts: Record<string, number> } }) {
  const { user } = useCrm();
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [leads, setLeads] = useState<Lead[]>(initial.leads);
  const [counts, setCounts] = useState<Record<string, number>>(initial.counts);
  const [calling, setCalling] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // One request for the tab being opened. The counts come with the page and
  // are refreshed by the same call, so switching tabs is a single round trip
  // rather than four.
  const load = useCallback(async () => {
    setBusy(true);
    const t = TABS.find((x) => x.key === tab)!;
    const p = new URLSearchParams({ bucket: t.bucket, limit: "200" });
    if (t.due) p.set("due", t.due);
    const r = await fetch(`/api/crm/leads?${p}`).then((x) => x.json());
    setLeads(Array.isArray(r.leads) ? r.leads : []);
    setBusy(false);
  }, [tab]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Calling</p>
        <h1 className="mt-1 font-display text-display-lg font-bold">My call queue</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
          {user.name} · work from the top — overdue first.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
              tab === t.key
                ? "text-[color:var(--text)]"
                : "text-[color:var(--text-faint)] hover:text-[color:var(--text-muted)]"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10.5px] font-bold tabular-nums text-white ${
                  t.key === "overdue" ? "bg-[color:var(--crit)]" : "bg-[color:var(--text-faint)]"
                }`}
              >
                {counts[t.key]}
              </span>
            )}
            <span
              className={`absolute inset-x-2 -bottom-px h-[2px] rounded-t bg-accent transition-opacity ${
                tab === t.key ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {busy && <div className="panel p-5 text-[13.5px] text-[color:var(--text-faint)]">Loading…</div>}
        {!busy && leads.length === 0 && (
          <div className="panel p-10 text-center text-[13.5px] text-[color:var(--text-faint)]">
            Nothing in this queue. 🎉
          </div>
        )}
        {leads.map((l) => (
          <div key={l.id} className="panel flex flex-wrap items-center gap-3 p-3.5">
            <div className="min-w-[180px] flex-1">
              <Link href={`/crm/leads/${l.id}`} className="font-semibold hover:text-accent">
                {l.name}
              </Link>
              <div className="text-[11.5px] text-[color:var(--text-faint)]">
                {l.phone} · {l.destination} · {l.visaType} · {l.source}
              </div>
            </div>

            <ScorePill score={l.score} priority={l.priority} size="sm" />
            <StatusBadge status={l.status} />

            <div className="min-w-[130px] text-[12px]">
              <div className={dueTone(l.nextFollowUpDate, today)}>
                {l.nextFollowUpDate ? `Due ${l.nextFollowUpDate}` : "No date"}
              </div>
              <div className="text-[color:var(--text-faint)]">
                {l.lastOutcome || "Never called"}
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:${l.phone.replace(/[^0-9+]/g, "")}`}
                className="rounded-xl bg-[color:var(--brand)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110"
              >
                Call
              </a>
              <a
                href={`https://wa.me/${(l.whatsapp || l.phone).replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#0f7a52] px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-110"
              >
                WhatsApp
              </a>
              <button
                onClick={() => setCalling(l)}
                className="rounded-xl bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:brightness-95"
              >
                Log outcome
              </button>
            </div>

            {l.notes && (
              <p className="w-full border-t border-line pt-2 text-[12.5px] text-[color:var(--text-muted)]">
                {l.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {calling && (
        <CallModal
          lead={calling}
          onClose={() => setCalling(null)}
          onLogged={() => {
            setCalling(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function CallingClient({
  initial,
}: {
  initial: { tab: Tab; leads: Lead[]; counts: Record<string, number> };
}) {
  return (
    <Suspense fallback={<div className="panel p-5 text-sm">Loading…</div>}>
      <CallingInner initial={initial} />
    </Suspense>
  );
}
