"use client";

// The lead profile: the record, the score breakdown, and the full history of
// everything anyone has ever done to this lead.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/salescrm/Shell";
import CallModal from "@/components/salescrm/CallModal";
import { ScorePill, StatusBadge, dueTone, formatINR } from "@/components/salescrm/ui";
import type { Activity } from "@/lib/leads/activity";
import type { CallLog } from "@/lib/leads/calls";
import type { ScoreRule } from "@/lib/leads/scoring";
import {
  Appointment, Invoice, LEAD_STATUSES, LOST_REASONS, Lead, REASON_REQUIRED,
  nextStatus,
} from "@/lib/leads/types";

type Payload = {
  lead: Lead;
  scoreRules: ScoreRule[];
  activities: Activity[];
  calls: CallLog[];
  appointments: Appointment[];
  invoices: Invoice[];
  canSeeMoney: boolean;
};

const KIND_TONE: Record<string, string> = {
  created: "bg-[color:var(--info)]",
  assigned: "bg-[color:var(--info)]",
  call: "bg-[color:var(--brand)]",
  whatsapp: "bg-[#0f7a52]",
  followup_created: "bg-[color:var(--warn)]",
  followup_done: "bg-[color:var(--good)]",
  followup_missed: "bg-[color:var(--crit)]",
  appointment_booked: "bg-[color:var(--brand)]",
  appointment_completed: "bg-[color:var(--good)]",
  payment: "bg-[color:var(--good)]",
  converted: "bg-[color:var(--good)]",
  status: "bg-[color:var(--text-faint)]",
  score: "bg-[color:var(--text-faint)]",
  note: "bg-[color:var(--text-faint)]",
};

export default function LeadProfile({ params }: { params: { id: string } }) {
  const { permissions, team } = useCrm();
  const [d, setD] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [calling, setCalling] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(() => {
    fetch(`/api/crm/leads/${params.id}`)
      .then((r) => r.json())
      .then((r) => (r.error ? setError(r.error) : setD(r)))
      .catch((e) => setError(String(e)));
  }, [params.id]);

  useEffect(load, [load]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    const r = await fetch(`/api/crm/leads/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    setSaving(false);
    if (r.error) setError(r.error);
    else load();
  }

  async function changeStatus(status: string) {
    // Business rule 7: closing a lead needs a reason, asked for here rather
    // than bounced back from the server.
    if (REASON_REQUIRED.includes(status as never)) {
      const reason = window.prompt(
        `Why is this lead ${status}?\n\n${LOST_REASONS.join(" · ")}`,
        "No Response"
      );
      if (!reason) return;
      return patch({ status, lostReason: reason });
    }
    return patch({ status });
  }

  if (error && !d) return <div className="panel p-5 text-sm text-[color:var(--crit)]">{error}</div>;
  if (!d) return <div className="panel p-5 text-sm text-[color:var(--text-faint)]">Loading…</div>;

  const l = d.lead;
  const suggested = nextStatus(l.status);
  const field = (k: string, v: string | number | null) => (
    <div className="border-b border-line py-2 last:border-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[color:var(--text-faint)]">
        {k}
      </div>
      <div className="text-[13.5px]">{v === null || v === "" ? "—" : v}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Link href="/crm/leads" className="text-[13px] font-semibold text-accent hover:underline">
        ← All leads
      </Link>

      {/* Header */}
      <div className="panel flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <p className="eyebrow">{l.id} · added {l.createdAt.slice(0, 10)}</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">{l.name}</h1>
          <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
            {l.phone} · {l.email || "no email"} · {l.destination} {l.visaType}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={l.status} />
            <ScorePill score={l.score} priority={l.priority} />
            <span className={`text-[12.5px] ${dueTone(l.nextFollowUpDate, today)}`}>
              {l.nextFollowUpDate ? `Follow up ${l.nextFollowUpDate} ${l.nextFollowUpTime}` : "No follow-up set"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`tel:${l.phone.replace(/[^0-9+]/g, "")}`}
            className="rounded-xl bg-[color:var(--brand)] px-3.5 py-2 text-[13px] font-semibold text-white"
          >
            Call
          </a>
          <a
            href={`https://wa.me/${(l.whatsapp || l.phone).replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#0f7a52] px-3.5 py-2 text-[13px] font-semibold text-white"
          >
            WhatsApp
          </a>
          {permissions.canCall && (
            <button
              onClick={() => setCalling(true)}
              className="rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-white"
            >
              Log call
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[color:var(--crit-soft)] px-3 py-2 text-[13px] text-[color:var(--crit)]">
          {error}
        </p>
      )}

      {/* Move the lead on */}
      {permissions.canEdit && (
        <div className="panel flex flex-wrap items-center gap-2 p-4">
          <span className="text-[12.5px] font-semibold text-[color:var(--text-muted)]">Status</span>
          {suggested && (
            <button
              onClick={() => changeStatus(suggested)}
              disabled={saving}
              className="rounded-xl bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              Move to {suggested} →
            </button>
          )}
          <select
            value={l.status}
            onChange={(e) => changeStatus(e.target.value)}
            className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-1.5 text-[12.5px]"
          >
            {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>

          {permissions.canAssign && (
            <>
              <span className="ml-2 text-[12.5px] font-semibold text-[color:var(--text-muted)]">Owner</span>
              <select
                value={l.owner}
                onChange={(e) => patch({ owner: e.target.value })}
                className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-1.5 text-[12.5px]"
              >
                <option value={l.owner}>{l.owner || "Unassigned"}</option>
                {team
                  .filter((t) => t.name !== l.owner)
                  .map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </>
          )}
          {l.lostReason && (
            <span className="text-[12.5px] text-[color:var(--crit)]">Reason: {l.lostReason}</span>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* The record */}
        <div className="panel p-4">
          <h2 className="mb-2 font-display text-[14px] font-bold">Lead details</h2>
          {field("Source", l.source)}
          {field("Owner", l.owner)}
          {field("WhatsApp", l.whatsapp)}
          {field("Residence", l.residence)}
          {field("Language", l.language)}
          {field("Age", l.age)}
          {field("Occupation", l.occupation)}
          {field("Current visa", l.currentVisaStatus)}
          {field("Previous refusal", l.previousRefusal ? "Yes" : "No")}
          {field("Travel history", l.travelHistory)}
          {field("Education", l.education)}
          {field("Work experience", l.workExperience)}
          {field("English test", l.englishTest)}
          {field("Budget", l.budget ? formatINR(l.budget) : "")}
          {field("Expected application", l.expectedApplication)}
          {field("Last contact", `${l.lastContactDate || "never"} ${l.lastOutcome}`)}
          {field("Notes", l.notes)}
        </div>

        {/* Score breakdown */}
        <div className="space-y-4">
          <div className="panel p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[14px] font-bold">Lead score</h2>
              <ScorePill score={l.score} priority={l.priority} />
            </div>
            <div className="mt-3 space-y-1.5">
              {d.scoreRules.map((r) => (
                <div key={r.label} className="flex items-center justify-between text-[12.5px]">
                  <span className={r.hit ? "" : "text-[color:var(--text-faint)]"}>
                    {r.hit ? "✓" : "○"} {r.label}
                  </span>
                  <span
                    className={`tabular-nums font-semibold ${
                      r.hit ? "text-[color:var(--good)]" : "text-[color:var(--text-faint)]"
                    }`}
                  >
                    +{r.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="mb-2 font-display text-[14px] font-bold">Consultations</h2>
            {d.appointments.length === 0 && (
              <p className="py-3 text-[13px] text-[color:var(--text-faint)]">None booked.</p>
            )}
            {d.appointments.map((a) => (
              <div key={a.id} className="border-b border-line py-2 text-[13px] last:border-0">
                <div className="font-medium">{a.date} {a.time} · {a.consultant}</div>
                <div className="text-[11.5px] text-[color:var(--text-faint)]">
                  {a.kind} · {a.status}
                </div>
              </div>
            ))}
          </div>

          {d.canSeeMoney && (
            <div className="panel p-4">
              <h2 className="mb-2 font-display text-[14px] font-bold">Invoices</h2>
              {d.invoices.length === 0 && (
                <p className="py-3 text-[13px] text-[color:var(--text-faint)]">Nothing billed yet.</p>
              )}
              {d.invoices.map((i) => (
                <div key={i.id} className="border-b border-line py-2 text-[13px] last:border-0">
                  <div className="flex justify-between font-medium">
                    <span>{i.number} · {i.service}</span>
                    <span className="tabular-nums">{formatINR(i.total)}</span>
                  </div>
                  <div className="flex justify-between text-[11.5px] text-[color:var(--text-faint)]">
                    <span>{i.status}</span>
                    <span className="tabular-nums">
                      paid {formatINR(i.paid)} · due {formatINR(i.balance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="panel p-4">
          <h2 className="mb-3 font-display text-[14px] font-bold">Activity timeline</h2>
          {d.activities.length === 0 && (
            <p className="py-3 text-[13px] text-[color:var(--text-faint)]">Nothing logged yet.</p>
          )}
          <ol className="relative space-y-3 border-l border-line pl-4">
            {d.activities.map((a) => (
              <li key={a.id} className="relative">
                <span
                  className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${
                    KIND_TONE[a.kind] ?? "bg-[color:var(--text-faint)]"
                  }`}
                />
                <div className="text-[13px] font-medium">{a.summary}</div>
                {a.detail && (
                  <div className="text-[12.5px] text-[color:var(--text-muted)]">{a.detail}</div>
                )}
                <div className="text-[11px] text-[color:var(--text-faint)]">
                  {new Date(a.at).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                  {a.actor ? ` · ${a.actor}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {calling && (
        <CallModal
          lead={l}
          onClose={() => setCalling(false)}
          onLogged={() => {
            setCalling(false);
            load();
          }}
        />
      )}
    </div>
  );
}
