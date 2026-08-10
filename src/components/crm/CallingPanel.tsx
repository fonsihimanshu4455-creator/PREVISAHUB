"use client";

import { useEffect, useMemo, useState } from "react";

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
  if (o === "Interested") return "bg-green-100 text-green-700 ring-green-200";
  if (o === "Callback") return "bg-blue-100 text-blue-700 ring-blue-200";
  if (o === "Connected") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (o === "Not interested" || o === "Wrong number")
    return "bg-red-100 text-red-700 ring-red-200";
  return "bg-amber-100 text-amber-700 ring-amber-200";
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
    return <div className="py-16 text-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="To call" value={counts.todo} tone="text-slate-800" />
        <Stat label="Callbacks due" value={counts.callback} tone="text-blue-600" />
        <Stat label="Interested" value={counts.interested} tone="text-green-600" />
      </div>

      {isAdmin && stats.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            By Telecaller
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Telecaller</th>
                  <th className="px-4 py-2.5 font-semibold">Assigned</th>
                  <th className="px-4 py-2.5 font-semibold">Called</th>
                  <th className="px-4 py-2.5 font-semibold">Pending</th>
                  <th className="px-4 py-2.5 font-semibold">Interested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((s) => (
                  <tr key={s.telecaller} className="hover:bg-orange-50/40">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {s.telecaller}
                    </td>
                    <td className="px-4 py-2.5">{s.assigned}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.called}</td>
                    <td className="px-4 py-2.5 font-semibold text-amber-600">
                      {s.pending}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-green-600">
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
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
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
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{t.name}</span>
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
              <div className="mt-0.5 text-sm text-slate-500">
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
                className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
              >
                📞 Call
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
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-600"
              >
                Log result
              </button>
            </div>
          </div>
        ))}

        {shown.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
            {targets.length === 0
              ? isAdmin
                ? "No numbers assigned yet. Assign students to a telecaller from the Students tab."
                : "No numbers assigned to you yet. Your admin will add them."
              : "Nothing in this list right now."}
          </div>
        )}
      </div>

      {calls.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Recent Calls
          </div>
          <div className="divide-y divide-slate-100">
            {calls.slice(0, 20).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-32 shrink-0 text-xs text-slate-400">
                  {c.calledAt.slice(0, 16).replace("T", " ")}
                </span>
                <span className="font-semibold text-slate-800">{c.studentName}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${outcomeTone(
                    c.outcome
                  )}`}
                >
                  {c.outcome}
                </span>
                {c.note && <span className="truncate text-slate-500">{c.note}</span>}
                {isAdmin && (
                  <span className="ml-auto text-xs text-slate-400">{c.telecaller}</span>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
            <h3 className="font-display text-lg font-bold text-slate-800">
              {target.name}
            </h3>
            <p className="font-mono text-sm text-slate-500">{target.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
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
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {outcome === "Callback" && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Call back on
              </span>
              <input
                type="date"
                value={callbackOn}
                onChange={(e) => setCallbackOn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">
              Note (optional)
            </span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. wants Canada, will send documents"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
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
