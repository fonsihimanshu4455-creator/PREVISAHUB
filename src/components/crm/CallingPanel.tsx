"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/admin/Icon";

export type CallTarget = {
  studentId: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  stage: string;
  telecaller: string;
  attempts: number;
  lastOutcome: string;
  lastCalledAt: string;
  callbackOn: string;
};

export type CallLog = {
  id: string;
  studentId: string;
  studentName: string;
  phone: string;
  telecaller: string;
  outcome: string;
  note: string;
  callbackOn: string;
  calledAt: string;
};

export type CallerStat = {
  telecaller: string;
  assigned: number;
  called: number;
  interested: number;
  pending: number;
};

const OUTCOMES = [
  "Connected",
  "Interested",
  "Callback",
  "No answer",
  "Busy",
  "Switched off",
  "Not interested",
  "Wrong number",
];

/** Colour by what the outcome means for the next action. */
function outcomeTone(o: string): string {
  if (o === "Interested")
    return "bg-good-soft text-[color:var(--good)] ring-[#bfe3d2]";
  if (o === "Callback") return "bg-info-soft text-[color:var(--info)] ring-[#c6d9f2]";
  if (o === "Connected")
    return "bg-surface-sunk text-[color:var(--text-muted)] ring-[color:var(--line)]";
  if (o === "Not interested" || o === "Wrong number")
    return "bg-crit-soft text-[color:var(--crit)] ring-[#f3c9c4]";
  return "bg-warn-soft text-[color:var(--warn)] ring-[#f0dcbb]";
}

const CLOSED = ["Not interested", "Wrong number"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CallingPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const [targets, setTargets] = useState<CallTarget[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<CallerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logging, setLogging] = useState<CallTarget | null>(null);
  const [filter, setFilter] = useState<"todo" | "callback" | "done" | "all">("todo");

  async function load() {
    setLoading(true);
    try {
      const d = await fetch("/api/calls").then((r) => r.json());
      if (d.error) setError(d.detail || d.error);
      else {
        setTargets(d.targets ?? []);
        setCalls(d.calls ?? []);
        setStats(d.stats ?? []);
        setError("");
      }
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const today = todayStr();

  const shown = useMemo(() => {
    return targets.filter((t) => {
      const closed = CLOSED.includes(t.lastOutcome);
      if (filter === "all") return true;
      if (filter === "done") return closed || t.lastOutcome === "Interested";
      if (filter === "callback")
        return t.callbackOn !== "" && t.callbackOn <= today && !closed;
      // "todo": never tried, or tried but not finished and not waiting on a
      // future callback date.
      if (closed || t.lastOutcome === "Interested") return false;
      if (t.callbackOn && t.callbackOn > today) return false;
      return true;
    });
  }, [targets, filter, today]);

  const counts = {
    todo: targets.filter(
      (t) =>
        !CLOSED.includes(t.lastOutcome) &&
        t.lastOutcome !== "Interested" &&
        !(t.callbackOn && t.callbackOn > today)
    ).length,
    callback: targets.filter(
      (t) => t.callbackOn && t.callbackOn <= today && !CLOSED.includes(t.lastOutcome)
    ).length,
    interested: targets.filter((t) => t.lastOutcome === "Interested").length,
  };

  if (loading) {
    return <div className="py-16 text-center text-[color:var(--text-faint)]">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="To call" value={counts.todo} tone="text-[color:var(--text)]" />
        <Stat label="Callbacks due" value={counts.callback} tone="text-[color:var(--info)]" />
        <Stat label="Interested" value={counts.interested} tone="text-[color:var(--good)]" />
      </div>

      {isAdmin && stats.length > 0 && (
        <div className="overflow-hidden panel">
          <div className="border-b border-line px-4 py-3 text-sm font-bold text-[color:var(--text)]">
            By Telecaller
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sunk text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-faint)]">
                  <th className="px-4 py-2.5 font-semibold">Telecaller</th>
                  <th className="px-4 py-2.5 font-semibold">Assigned</th>
                  <th className="px-4 py-2.5 font-semibold">Called</th>
                  <th className="px-4 py-2.5 font-semibold">Pending</th>
                  <th className="px-4 py-2.5 font-semibold">Interested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.map((s) => (
                  <tr key={s.telecaller} className="hover:bg-accent/[0.04]">
                    <td className="px-4 py-2.5 font-semibold text-[color:var(--text)]">
                      {s.telecaller}
                    </td>
                    <td className="px-4 py-2.5">{s.assigned}</td>
                    <td className="px-4 py-2.5 text-[color:var(--text-muted)]">{s.called}</td>
                    <td className="px-4 py-2.5 font-semibold text-[color:var(--warn)]">
                      {s.pending}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-[color:var(--good)]">
                      {s.interested}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["todo", `To call (${counts.todo})`],
            ["callback", `Callbacks (${counts.callback})`],
            ["done", "Finished"],
            ["all", "Everyone"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === k
                ? "bg-ink-800 text-white"
                : "bg-surface text-[color:var(--text-muted)] ring-1 ring-[color:var(--line-strong)] hover:bg-surface-sunk"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {shown.map((t) => (
          <div
            key={t.studentId}
            className="flex flex-wrap items-center gap-3 panel p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[color:var(--text)]">{t.name}</span>
                {t.lastOutcome && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${outcomeTone(
                      t.lastOutcome
                    )}`}
                  >
                    {t.lastOutcome}
                  </span>
                )}
                {t.callbackOn && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    callback {t.callbackOn}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-sm text-[color:var(--text-muted)]">
                <span className="font-mono">{t.phone}</span>
                {t.city && <> · {t.city}</>} · {t.country}
                {t.attempts > 0 && (
                  <> · {t.attempts} attempt{t.attempts === 1 ? "" : "s"}</>
                )}
                {isAdmin && t.telecaller && <> · {t.telecaller}</>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${t.phone.replace(/[^0-9+]/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-ink-700"
              >
                <Icon name="phone" className="h-3.5 w-3.5" strokeWidth={2.2} />
                Call
              </a>
              <a
                href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-600"
              >
                WhatsApp
              </a>
              <button
                onClick={() => setLogging(t)}
                className="rounded-lg border border-line-strong px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)] transition hover:border-orange-400 hover:text-orange-600"
              >
                Log result
              </button>
            </div>
          </div>
        ))}

        {shown.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line-strong bg-white py-12 text-center text-sm text-[color:var(--text-faint)]">
            {targets.length === 0
              ? isAdmin
                ? "No numbers assigned yet. Assign students to a telecaller from the Students tab."
                : "No numbers assigned to you yet. Your admin will add them."
              : "Nothing in this list right now."}
          </div>
        )}
      </div>

      {calls.length > 0 && (
        <div className="overflow-hidden panel">
          <div className="border-b border-line px-4 py-3 text-sm font-bold text-[color:var(--text)]">
            Recent Calls
          </div>
          <div className="divide-y divide-line">
            {calls.slice(0, 20).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-32 shrink-0 text-xs text-[color:var(--text-faint)]">
                  {c.calledAt.slice(0, 16).replace("T", " ")}
                </span>
                <span className="font-semibold text-[color:var(--text)]">{c.studentName}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${outcomeTone(
                    c.outcome
                  )}`}
                >
                  {c.outcome}
                </span>
                {c.note && <span className="truncate text-[color:var(--text-muted)]">{c.note}</span>}
                {isAdmin && (
                  <span className="ml-auto text-xs text-[color:var(--text-faint)]">{c.telecaller}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {logging && (
        <LogCallModal
          target={logging}
          onClose={() => setLogging(null)}
          onSaved={() => {
            setLogging(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="panel p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

function LogCallModal({
  target,
  onClose,
  onSaved,
}: {
  target: CallTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState("Connected");
  const [note, setNote] = useState("");
  const [callbackOn, setCallbackOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: target.studentId,
          outcome,
          note,
          callbackOn: outcome === "Callback" ? callbackOn : "",
        }),
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      else onSaved();
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[color:var(--text)]">
              {target.name}
            </h3>
            <p className="font-mono text-sm text-[color:var(--text-muted)]">{target.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-faint)] hover:bg-surface-sunk"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-[color:var(--text-muted)]">
              How did it go?
            </span>
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    outcome === o
                      ? "bg-slate-800 text-white"
                      : "bg-white text-[color:var(--text-muted)] ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {outcome === "Callback" && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
                Call back on
              </span>
              <input
                type="date"
                value={callbackOn}
                onChange={(e) => setCallbackOn(e.target.value)}
                className="w-full rounded-xl border border-line-strong px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">
              Note (optional)
            </span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. wants Canada, will send documents"
              className="w-full rounded-xl border border-line-strong px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-[color:var(--text-muted)] hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy || (outcome === "Callback" && !callbackOn)}
              className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
