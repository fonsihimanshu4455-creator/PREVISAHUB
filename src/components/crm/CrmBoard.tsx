"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import CallingPanel from "@/components/crm/CallingPanel";
import {
  COUNTRIES,
  Country,
  formatScore,
  isIeltsPass,
  priorityColor,
  stageFill,
  relativeDue,
  stageColor,
  Student,
  Task,
  TestType,
  TODAY,
  VISA_STAGES,
  VisaStage,
} from "@/lib/crm-data";

type View =
  | "dashboard" | "students" | "pipeline" | "tasks" | "payments"
  | "tests" | "attendance" | "documents" | "calling";

export type DocMeta = {
  id: string; studentId: string; studentName: string; name: string;
  kind: string; mime: string; size: number; uploadedBy: string; uploadedAt: string;
};

export type TestRec = {
  id: string; studentId: string; studentName: string; exam: string;
  kind: string; section: string; score: number; maxScore: number;
  takenOn: string; note: string;
};
export type Progress = {
  studentId: string; studentName: string; section: string;
  latest: number; maxScore: number; attempts: number; best: number;
};
export type AttRec = { studentId: string; studentName: string; status: string };
export type AttSummary = {
  studentId: string; studentName: string; present: number; absent: number;
  late: number; leave: number; total: number; percent: number;
};

export type FeeSummary = {
  studentId: string; studentName: string; counsellor: string;
  totalFee: number; paid: number; pending: number;
};
export type PaymentRec = {
  id: string; studentId: string; studentName: string; amount: number;
  method: string; purpose: string; paidOn: string; note: string;
};

type NewStudentInput = {
  name: string;
  phone: string;
  city: string;
  country: Country;
  counsellor: string;
};

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Deterministic (UTC-anchored) so server and client render the same string.
const TODAY_LABEL = new Date(TODAY + "T00:00:00Z").toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const VIEWS: View[] = [
  "dashboard", "students", "pipeline", "tasks", "payments",
  "tests", "attendance", "documents", "calling",
];

export default function CrmBoard({ showHeader = true }: { showHeader?: boolean }) {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const [view, setView] = useState<View>(
    VIEWS.includes(tabParam as View) ? (tabParam as View) : "dashboard"
  );

  // Sidebar links point at ?tab=…, and the layout persists across those
  // navigations, so the tab has to follow the URL rather than only the
  // initial render.
  useEffect(() => {
    if (VIEWS.includes(tabParam as View)) setView(tabParam as View);
  }, [tabParam]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<"db" | "demo" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<FeeSummary[]>([]);
  const [payments, setPayments] = useState<PaymentRec[]>([]);
  const [totals, setTotals] = useState<{ billed: number; collected: number; pending: number } | null>(null);
  const [counsellors, setCounsellors] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState(() => ({
    q: "",
    stage: params.get("stage") ?? "All",
    country: "All",
    due: params.get("due") ?? "",
  }));
  const [searching, setSearching] = useState(false);
  const [telecallers, setTelecallers] = useState<string[]>([]);
  const [role, setRole] = useState<"admin" | "staff">("admin");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const initial = new URLSearchParams();
        if (params.get("stage")) initial.set("stage", params.get("stage")!);
        if (params.get("due")) initial.set("due", params.get("due")!);
        const [rs, rt, rc] = await Promise.all([
          fetch(`/api/students?${initial}`).then((r) => r.json()),
          fetch("/api/tasks").then((r) => r.json()),
          fetch("/api/counsellors").then((r) => r.json()),
        ]);
        if (!alive) return;
        if (rs.error) {
          setError(rs.detail || rs.error);
          setMode("demo");
          return;
        }
        if (Array.isArray(rs.students)) setStudents(rs.students);
        if (typeof rs.total === "number") setTotal(rs.total);
        if (Array.isArray(rt.tasks)) setTasks(rt.tasks);
        setMode(rs.mode === "db" ? "db" : "demo");
        if (rs.role) setRole(rs.role);
        if (Array.isArray(rc?.counsellors)) setCounsellors(rc.counsellors);
        if (Array.isArray(rc?.telecallers)) setTelecallers(rc.telecallers);
      } catch (e) {
        if (alive) {
          setError(String(e));
          setMode("demo");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function addStudent(input: NewStudentInput) {
    const res = await api("/api/students", "POST", input);
    if (res.student) setStudents((prev) => [res.student, ...prev]);
  }

  async function updateStudent(id: string, patch: Partial<Student>) {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch, lastUpdated: TODAY } : s))
    );
    await api(`/api/students/${id}`, "PATCH", patch);
  }

  async function moveStudent(student: Student, dir: 1 | -1) {
    const idx = VISA_STAGES.indexOf(student.stage);
    const next = idx + dir;
    if (next < 0 || next >= VISA_STAGES.length) return;
    const stage = VISA_STAGES[next];
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, stage, lastUpdated: TODAY } : s))
    );
    await api(`/api/students/${student.id}`, "PATCH", { stage });
  }

  async function toggleTask(id: string) {
    const current = tasks.find((t) => t.id === id);
    const done = !current?.done;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await api(`/api/tasks/${id}`, "PATCH", { done });
  }

  // /api/reports already returns payments and fees, so this is one request
  // rather than two — /api/payments would repeat work this endpoint does.
  async function loadMoney() {
    try {
      const rr = await fetch("/api/reports").then((r) => r.json());
      if (Array.isArray(rr.recentPayments)) setPayments(rr.recentPayments);
      if (Array.isArray(rr.dues)) setFees(rr.dues);
      if (rr.totals) setTotals(rr.totals);
    } catch {
      // Money data is optional here — the rest of the CRM still works.
    }
  }

  async function addPayment(body: Record<string, unknown>) {
    const r = await api("/api/payments", "POST", body);
    await loadMoney();
    return r;
  }

  async function removePayment(id: string) {
    await api(`/api/payments/${id}`, "DELETE");
    await loadMoney();
  }

  // Searching and filtering happen in SQL, so the browser never holds the
  // whole table. Debounced, because this runs on every keystroke.
  const firstQuery = useRef(true);
  useEffect(() => {
    if (firstQuery.current) {
      firstQuery.current = false;
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const p = new URLSearchParams();
      if (query.q) p.set("q", query.q);
      if (query.stage !== "All") p.set("stage", query.stage);
      if (query.country !== "All") p.set("country", query.country);
      if (query.due) p.set("due", query.due);
      try {
        const r = await fetch(`/api/students?${p}`).then((x) => x.json());
        if (Array.isArray(r.students)) setStudents(r.students);
        if (typeof r.total === "number") setTotal(r.total);
      } catch {
        /* keep whatever is on screen */
      }
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch fees/payments the first time the Payments tab is opened, so the
  // dashboard is not held up by data it does not show.
  const [moneyLoaded, setMoneyLoaded] = useState(false);
  useEffect(() => {
    if (view === "payments" && !moneyLoaded) {
      setMoneyLoaded(true);
      loadMoney();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, moneyLoaded]);

  const pendingTasks = tasks.filter((t) => !t.done && t.due <= TODAY).length;

  const tabs: { key: View; label: string; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "students", label: "Students" },
    { key: "pipeline", label: "Visa Pipeline" },
    { key: "tasks", label: "Daily Tasks", badge: pendingTasks },
    { key: "payments", label: "Payments" },
    { key: "tests", label: "Tests" },
    { key: "attendance", label: "Attendance" },
    { key: "documents", label: "Documents" },
    { key: "calling", label: "Calling" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {showHeader && (
            <>
              <p className="eyebrow">Caseload</p>
              <h1 className="mt-1 font-display text-display-lg font-bold">Students</h1>
              <p className="mt-1 text-[14px] text-[color:var(--text-muted)]">{TODAY_LABEL}</p>
            </>
          )}
        </div>
      </div>

      {/* Setup hint when there is no database yet */}
      {mode === "demo" && <SetupPanel error={error} />}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
              view === t.key
                ? "text-[color:var(--text)]"
                : "text-[color:var(--text-faint)] hover:text-[color:var(--text-muted)]"
            }`}
          >
            {t.label}
            {!!t.badge && t.badge > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[10.5px] font-bold tabular-nums text-white">
                {t.badge}
              </span>
            )}
            <span
              className={`absolute inset-x-2 -bottom-px h-[2px] rounded-t bg-accent transition-opacity duration-200 ${
                view === t.key ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        ))}
      </div>

      {view === "dashboard" && <Dashboard students={students} onGoto={setView} />}
      {view === "students" && (
        <Students
          students={students}
          counsellors={counsellors}
          telecallers={telecallers}
          canReassign={role === "admin"}
          query={query}
          onQuery={setQuery}
          total={total}
          searching={searching}
          onAdd={addStudent}
          onUpdate={updateStudent}
        />
      )}
      {view === "pipeline" && <Pipeline students={students} onMove={moveStudent} />}
      {view === "tasks" && <Tasks tasks={tasks} onToggle={toggleTask} />}
      {view === "tests" && <Tests students={students} />}
      {view === "attendance" && <Attendance students={students} />}
      {view === "documents" && <Documents students={students} />}
      {view === "calling" && <CallingPanel isAdmin />}
      {view === "payments" && (
        <Payments
          students={students}
          fees={fees}
          payments={payments}
          totals={totals}
          onAdd={addPayment}
          onDelete={removePayment}
        />
      )}
    </div>
  );
}

// =========================================================================
// SETUP / DIAGNOSTICS
// =========================================================================
type CheckResult = {
  ok: boolean;
  checks: { label: string; ok: boolean; detail: string }[];
  next: string;
};

function SetupPanel({ error }: { error: string | null }) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setSeedMsg(null);
    try {
      setResult(await fetch("/api/db-check").then((r) => r.json()));
    } catch (e) {
      setResult({
        ok: false,
        checks: [{ label: "Could not run the check", ok: false, detail: String(e) }],
        next: "Try again in a moment.",
      });
    }
    setBusy(false);
  }

  async function seed() {
    setBusy(true);
    try {
      const r = await fetch("/api/seed", { method: "POST" }).then((x) => x.json());
      setSeedMsg(r.ok ? `${r.message} Reload the page to see your data.` : r.error);
      if (r.ok) await check();
    } catch (e) {
      setSeedMsg(String(e));
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="font-semibold">⚠ CRM database not connected yet</div>
      <p className="mt-1 text-amber-800">
        You are seeing starter data — nothing is being saved. Run the check below
        and it will tell you exactly what is missing.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={check}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Check connection"}
        </button>
        <button
          onClick={seed}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Create tables
        </button>
      </div>

      {seedMsg && (
        <div className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs">{seedMsg}</div>
      )}

      {result && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-white/70 p-3">
          {result.checks.map((c) => (
            <div key={c.label} className="flex gap-2 text-xs">
              <span className={c.ok ? "text-green-600" : "text-red-600"}>
                {c.ok ? "✓" : "✕"}
              </span>
              <span>
                <span className="font-semibold">{c.label}</span>
                <span className="text-slate-600"> — {c.detail}</span>
              </span>
            </div>
          ))}
          <div className="border-t border-amber-200 pt-2 text-xs font-semibold">
            Next: {result.next}
          </div>
        </div>
      )}

      {error && !result && (
        <div className="mt-2 break-all font-mono text-[11px] opacity-70">{error}</div>
      )}
    </div>
  );
}

// =========================================================================
// DASHBOARD
// =========================================================================
function Dashboard({
  students,
  onGoto,
}: {
  students: Student[];
  onGoto: (v: View) => void;
}) {
  const total = students.length;
  const approved = students.filter((s) => s.stage === "Approved").length;
  const inProgress = students.filter(
    (s) => !["Approved", "Rejected", "Enquiry"].includes(s.stage)
  ).length;
  const newLeads = students.filter((s) => s.stage === "Enquiry").length;

  const kpis = [
    { label: "Total Students", value: total, sub: "in pipeline", tone: "text-[color:var(--text)]" },
    { label: "Visas Approved", value: approved, sub: "success stories", tone: "text-[color:var(--good)]" },
    { label: "In Progress", value: inProgress, sub: "active applications", tone: "text-[color:var(--info)]" },
    { label: "New Leads", value: newLeads, sub: "awaiting counselling", tone: "text-[color:var(--text-muted)]" },
  ];

  const stageCounts = VISA_STAGES.map((st) => ({
    stage: st,
    count: students.filter((s) => s.stage === st).length,
  }));
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count));

  const countryCounts = COUNTRIES.map((c) => ({
    country: c,
    count: students.filter((s) => s.country === c).length,
  })).filter((c) => c.count > 0);

  const testTakers = students.filter((s) => s.testType !== "Not Taken" && s.score !== null);
  const passing = testTakers.filter(isIeltsPass).length;
  const passRate = testTakers.length ? Math.round((passing / testTakers.length) * 100) : 0;

  const todaysFollowUps = students
    .filter((s) => s.nextFollowUp <= TODAY)
    .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="panel p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-faint)]">
              {k.label}
            </div>
            <div className={`mt-1 font-display text-3xl font-extrabold ${k.tone}`}>
              {k.value}
            </div>
            <div className="text-xs text-[color:var(--text-muted)]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold">Students by Visa Stage</h3>
            <button
              onClick={() => onGoto("pipeline")}
              className="text-[12.5px] font-semibold text-accent hover:underline"
            >
              View pipeline →
            </button>
          </div>
          <div className="space-y-3">
            {stageCounts.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs font-medium text-slate-600">{s.stage}</div>
                <div className="h-[18px] flex-1 overflow-hidden rounded-[4px] bg-surface-sunk">
                  <div
                    className="h-full rounded-[4px] animate-grow-x"
                    style={{
                      width: `${(s.count / maxStage) * 100}%`,
                      background: stageFill(s.stage),
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-display text-[13px] font-bold tabular-nums">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="mb-3 font-display text-[15px] font-bold">IELTS / PTE Readiness</h3>
          <div className="flex justify-center">
            <ProgressRing percent={passRate} />
          </div>
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[color:var(--text-muted)]">Test takers</span>
              <span className="font-semibold text-[color:var(--text)]">{testTakers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--text-muted)]">Target achieved</span>
              <span className="font-semibold text-green-600">{passing}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--text-muted)]">Still preparing</span>
              <span className="font-semibold text-orange-500">
                {testTakers.length - passing}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold">
              Today&apos;s Follow-ups
              <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
                {todaysFollowUps.length}
              </span>
            </h3>
            <button
              onClick={() => onGoto("students")}
              className="text-[12.5px] font-semibold text-accent hover:underline"
            >
              All students →
            </button>
          </div>
          <div className="divide-y divide-line">
            {todaysFollowUps.length === 0 && (
              <p className="py-6 text-center text-sm text-[color:var(--text-faint)]">
                All caught up — no follow-ups pending 🎉
              </p>
            )}
            {todaysFollowUps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[color:var(--text)]">{s.name}</div>
                  <div className="truncate text-xs text-[color:var(--text-muted)]">{s.notes}</div>
                </div>
                <span
                  className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:inline ${stageColor(
                    s.stage
                  )}`}
                >
                  {s.stage}
                </span>
                <a
                  href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full bg-green-500 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-green-600"
                >
                  WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="mb-4 font-display text-[15px] font-bold">By Destination</h3>
          <div className="space-y-3">
            {countryCounts
              .sort((a, b) => b.count - a.count)
              .map((c) => (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="text-lg">{countryFlag(c.country)}</span>
                  <span className="flex-1 text-sm font-medium text-slate-600">{c.country}</span>
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${(c.count / Math.max(1, students.length)) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-sm font-bold text-[color:var(--text)]">
                    {c.count}
                  </span>
                </div>
              ))}
            {countryCounts.length === 0 && (
              <p className="py-4 text-center text-sm text-[color:var(--text-faint)]">No students yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// STUDENTS
// =========================================================================
function Students({
  students,
  counsellors,
  telecallers,
  canReassign,
  query,
  onQuery,
  total,
  searching,
  onAdd,
  onUpdate,
}: {
  students: Student[];
  counsellors: string[];
  telecallers: string[];
  canReassign: boolean;
  query: { q: string; stage: string; country: string; due: string };
  onQuery: (q: { q: string; stage: string; country: string; due: string }) => void;
  total: number;
  searching: boolean;
  onAdd: (input: NewStudentInput) => void | Promise<void>;
  onUpdate: (id: string, patch: Partial<Student>) => void | Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const filtered = students;

  function saveStudent(updated: Student) {
    onUpdate(updated.id, {
      stage: updated.stage,
      testType: updated.testType,
      score: updated.score,
      nextFollowUp: updated.nextFollowUp,
      notes: updated.notes,
      ...(canReassign
        ? { counsellor: updated.counsellor, telecaller: updated.telecaller }
        : {}),
    });
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 panel p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-faint)]">
            <SearchIcon />
          </span>
          <input
            value={query.q}
            onChange={(e) => onQuery({ ...query, q: e.target.value })}
            placeholder="Search name, ID, city, phone…"
            className="w-full rounded-xl border border-line-strong bg-surface-sunk py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-accent focus:bg-white"
          />
        </div>
        <select
          value={query.stage}
          onChange={(e) => onQuery({ ...query, stage: e.target.value })}
          className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          <option value="All">All stages</option>
          {VISA_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={query.country}
          onChange={(e) => onQuery({ ...query, country: e.target.value })}
          className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          <option value="All">All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
        >
          + Add Student
        </button>
      </div>

      {(query.due || query.stage !== "All") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-[color:var(--text-muted)]">Filtered by</span>
          {query.stage !== "All" && (
            <button
              onClick={() => onQuery({ ...query, stage: "All" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk px-3 py-1 text-[12px] font-semibold text-[color:var(--text-muted)] ring-1 ring-[color:var(--line)] transition hover:text-[color:var(--text)]"
            >
              {query.stage} <span aria-hidden>✕</span>
            </button>
          )}
          {query.due === "today" && (
            <button
              onClick={() => onQuery({ ...query, due: "" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunk px-3 py-1 text-[12px] font-semibold text-[color:var(--text-muted)] ring-1 ring-[color:var(--line)] transition hover:text-[color:var(--text)]"
            >
              Follow-up due today <span aria-hidden>✕</span>
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-sunk text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-faint)]">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Test / Score</th>
                <th className="px-4 py-3 font-semibold">Visa Stage</th>
                <th className="px-4 py-3 font-semibold">Follow-up</th>
                <th className="px-4 py-3 font-semibold">Counsellor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((s) => (
                <tr key={s.id} className="transition hover:bg-accent/[0.04]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} />
                      <div>
                        <div className="font-semibold text-[color:var(--text)]">{s.name}</div>
                        <div className="text-xs text-[color:var(--text-faint)]">
                          {s.id} · {s.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>{countryFlag(s.country)}</span>
                      <span className="text-slate-700">{s.country}</span>
                    </div>
                    <div className="text-xs text-[color:var(--text-faint)]">{s.intake}</div>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCell student={s} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${stageColor(
                        s.stage
                      )}`}
                    >
                      {s.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        s.nextFollowUp <= TODAY ? "text-red-600" : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      {relativeDue(s.nextFollowUp)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--text-muted)]">{s.counsellor}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">
                    {total === 0 && !query.q && query.stage === "All" && query.country === "All" && !query.due
                      ? "No students yet — add your first one above."
                      : "No students match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-[color:var(--text-faint)]">
          {searching
            ? "Searching…"
            : `Showing ${filtered.length}${
                total > filtered.length ? ` of ${total}` : ""
              } student${total === 1 ? "" : "s"}`}
        </div>
      </div>

      {showAdd && (
        <AddStudentModal
          counsellors={counsellors}
          onClose={() => setShowAdd(false)}
          onAdd={(i) => {
            onAdd(i);
            setShowAdd(false);
          }}
        />
      )}
      {editing && (
        <ManageStudentModal
          student={editing}
          counsellors={counsellors}
          telecallers={telecallers}
          canReassign={canReassign}
          onClose={() => setEditing(null)}
          onSave={saveStudent}
        />
      )}
    </div>
  );
}

function ScoreCell({ student }: { student: Student }) {
  if (student.testType === "Not Taken" || student.score === null) {
    return <span className="text-xs italic text-[color:var(--text-faint)]">Not taken yet</span>;
  }
  const pass = isIeltsPass(student);
  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--text-muted)]">
        {student.testType}
      </span>
      <span className={`font-bold ${pass ? "text-green-600" : "text-orange-500"}`}>
        {formatScore(student)}
      </span>
      <span className="text-xs text-[color:var(--text-faint)]">
        / target{" "}
        {student.testType === "IELTS" ? student.targetScore.toFixed(1) : student.targetScore}
      </span>
      {pass ? (
        <span className="text-green-500">✓</span>
      ) : (
        <span className="text-[10px] font-semibold text-orange-500">below</span>
      )}
    </div>
  );
}

// =========================================================================
// PIPELINE
// =========================================================================
function Pipeline({
  students,
  onMove,
}: {
  students: Student[];
  onMove: (student: Student, dir: 1 | -1) => void | Promise<void>;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-[color:var(--text-muted)]">
        Use the arrows to move a student through the visa journey. Changes save
        automatically.
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {VISA_STAGES.map((stage) => {
          const col = students.filter((s) => s.stage === stage);
          return (
            <div key={stage} className="w-64 shrink-0">
              <div
                className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ring-1 ${stageColor(
                  stage
                )}`}
              >
                <span>{stage}</span>
                <span className="rounded-full bg-white/70 px-2 text-xs">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((s) => {
                  const idx = VISA_STAGES.indexOf(s.stage);
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={s.name} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--text)]">
                            {s.name}
                          </div>
                          <div className="text-xs text-[color:var(--text-faint)]">
                            {countryFlag(s.country)} {s.country}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-[color:var(--text-faint)]">
                          {s.testType !== "Not Taken"
                            ? `${s.testType} ${formatScore(s)}`
                            : "No test"}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onMove(s, -1)}
                            disabled={idx === 0}
                            className="rounded-md border border-slate-200 px-1.5 text-xs text-[color:var(--text-muted)] transition hover:bg-slate-50 disabled:opacity-30"
                            title="Move back"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => onMove(s, 1)}
                            disabled={idx === VISA_STAGES.length - 1}
                            className="rounded-md border border-slate-200 px-1.5 text-xs text-[color:var(--text-muted)] transition hover:bg-slate-50 disabled:opacity-30"
                            title="Advance"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {col.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// TASKS
// =========================================================================
function Tasks({
  tasks,
  onToggle,
}: {
  tasks: Task[];
  onToggle: (id: string) => void | Promise<void>;
}) {
  const [filter, setFilter] = useState<"today" | "all" | "done">("today");

  const shown = tasks.filter((t) => {
    if (filter === "done") return t.done;
    if (filter === "today") return !t.done && t.due <= TODAY;
    return !t.done;
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-[15px] font-bold">Today&apos;s Progress</h3>
            <p className="text-xs text-[color:var(--text-muted)]">
              {doneCount} of {tasks.length} tasks completed
            </p>
          </div>
          <span className="font-display text-2xl font-extrabold text-orange-500">
            {progress}%
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["today", "Due Today"],
            ["all", "All Pending"],
            ["done", "Completed"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === key
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {shown.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 panel p-4 transition ${
              t.done ? "opacity-60" : ""
            }`}
          >
            <button
              onClick={() => onToggle(t.id)}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                t.done
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-slate-300 hover:border-orange-400"
              }`}
            >
              {t.done && <CheckMark />}
            </button>
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-semibold ${
                  t.done ? "text-[color:var(--text-faint)] line-through" : "text-[color:var(--text)]"
                }`}
              >
                {t.title}
              </div>
              <div className="text-xs text-[color:var(--text-faint)]">
                {t.studentName} · {relativeDue(t.due)}
              </div>
            </div>
            <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--text-muted)] sm:inline">
              {t.type}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${priorityColor(
                t.priority
              )}`}
            >
              {t.priority}
            </span>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-[color:var(--text-faint)]">
            Nothing here — great job! 🎉
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// MODALS + SHARED
// =========================================================================
function ManageStudentModal({
  student,
  counsellors,
  telecallers,
  canReassign,
  onClose,
  onSave,
}: {
  student: Student;
  counsellors: string[];
  telecallers: string[];
  canReassign: boolean;
  onClose: () => void;
  onSave: (s: Student) => void;
}) {
  const [draft, setDraft] = useState<Student>({ ...student });

  return (
    <Modal onClose={onClose} title={`Manage · ${student.name}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-3">
          <Avatar name={student.name} big />
          <div>
            <div className="font-semibold text-[color:var(--text)]">{student.name}</div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {student.id} · {student.phone}
            </div>
          </div>
        </div>

        <Field label="Visa Stage">
          <select
            value={draft.stage}
            onChange={(e) => setDraft({ ...draft, stage: e.target.value as VisaStage })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {VISA_STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Test Type">
            <select
              value={draft.testType}
              onChange={(e) => setDraft({ ...draft, testType: e.target.value as TestType })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option>IELTS</option>
              <option>PTE</option>
              <option>Not Taken</option>
            </select>
          </Field>
          <Field label={draft.testType === "PTE" ? "Score (10-90)" : "Band (0-9)"}>
            <input
              type="number"
              step={draft.testType === "PTE" ? 1 : 0.5}
              value={draft.score ?? ""}
              disabled={draft.testType === "Not Taken"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  score: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent disabled:bg-slate-50"
            />
          </Field>
        </div>

        {canReassign && (
          <>
            <Field label="Counsellor">
              <CounsellorPicker
                value={draft.counsellor}
                options={counsellors}
                onChange={(v) => setDraft({ ...draft, counsellor: v })}
              />
            </Field>
            <Field label="Telecaller (who calls this number)">
              <select
                value={draft.telecaller ?? ""}
                onChange={(e) => setDraft({ ...draft, telecaller: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
              >
                <option value="">— not assigned —</option>
                {telecallers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label="Next Follow-up">
          <input
            type="date"
            value={draft.nextFollowUp}
            onChange={(e) => setDraft({ ...draft, nextFollowUp: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...draft, lastUpdated: TODAY })}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
          >
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}


/**
 * Counsellor picker. The list comes from staff accounts plus names already on
 * students; choosing "Add new counsellor" swaps in a text box so a name can be
 * used before (or without) creating a login for it.
 */
function CounsellorPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const known = options.includes(value);
  const [typing, setTyping] = useState(options.length === 0 || (!!value && !known));

  if (typing) {
    return (
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Simran Kaur"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setTyping(false);
              onChange(options[0]);
            }}
            className="shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-[color:var(--text-muted)] hover:bg-slate-50"
          >
            Pick
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          setTyping(true);
          onChange("");
        } else onChange(e.target.value);
      }}
      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
    >
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value="__new__">+ Add new counsellor…</option>
    </select>
  );
}

function AddStudentModal({
  counsellors,
  onClose,
  onAdd,
}: {
  counsellors: string[];
  onClose: () => void;
  onAdd: (input: NewStudentInput) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<Country>("Canada");
  const [counsellor, setCounsellor] = useState("Rohit Sharma");

  const canSave = name.trim() && phone.trim();

  return (
    <Modal onClose={onClose} title="Add New Student / Lead">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label="Phone / WhatsApp *">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 …"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label="City">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ludhiana"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label="Destination">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as Country)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Assign Counsellor">
          <CounsellorPicker
            value={counsellor}
            options={counsellors}
            onChange={setCounsellor}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onAdd({
                name: name.trim(),
                phone: phone.trim(),
                city: city.trim(),
                country,
                counsellor,
              })
            }
            disabled={!canSave}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add student
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[color:var(--text)]">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-faint)] transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function Avatar({ name, big }: { name: string; big?: boolean }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-sunk font-semibold text-[color:var(--text-muted)] ring-1 ring-[color:var(--line)] ${
        big ? "h-11 w-11 text-[13px]" : "h-8 w-8 text-[11px]"
      }`}
    >
      {initials}
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="relative h-32 w-32">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--info)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[22px] font-bold tabular-nums text-[color:var(--text)]">
          {percent}%
        </span>
        <span className="text-[10px] font-semibold text-[color:var(--text-faint)]">on target</span>
      </div>
    </div>
  );
}

function countryFlag(c: Country): string {
  const map: Record<Country, string> = {
    Canada: "🇨🇦",
    Australia: "🇦🇺",
    USA: "🇺🇸",
    UK: "🇬🇧",
    Germany: "🇩🇪",
    "New Zealand": "🇳🇿",
  };
  return map[c];
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// =========================================================================
// PAYMENTS
// =========================================================================
function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function Payments({
  students,
  fees,
  payments,
  totals,
  onAdd,
  onDelete,
}: {
  students: Student[];
  fees: FeeSummary[];
  payments: PaymentRec[];
  totals: { billed: number; collected: number; pending: number } | null;
  onAdd: (body: Record<string, unknown>) => Promise<{ error?: string }>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showFee, setShowFee] = useState(false);

  // Totals come from the server: `payments` here is only the recent slice and
  // `fees` only the students who still owe, so summing them would undercount.
  const collected = totals?.collected ?? 0;
  const pending = totals?.pending ?? 0;
  const billed = totals?.billed ?? 0;
  const owing = fees;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-faint)]">Collected</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-green-600">{inr(collected)}</div>
        </div>
        <div className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-faint)]">Pending</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-red-600">{inr(pending)}</div>
        </div>
        <div className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-faint)]">Billed</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-[color:var(--text)]">{inr(billed)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
        >
          + Record Payment
        </button>
        <button
          onClick={() => setShowFee(true)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Set student fee
        </button>
      </div>

      {/* Outstanding */}
      <div className="overflow-hidden panel">
        <div className="border-b border-line px-4 py-3 text-sm font-bold text-[color:var(--text)]">
          Pending Dues
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <th className="px-4 py-2.5 font-semibold">Student</th>
                <th className="px-4 py-2.5 font-semibold">Fee</th>
                <th className="px-4 py-2.5 font-semibold">Paid</th>
                <th className="px-4 py-2.5 font-semibold">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {owing.map((f) => (
                <tr key={f.studentId} className="hover:bg-accent/[0.04]">
                  <td className="px-4 py-2.5 font-semibold text-[color:var(--text)]">{f.studentName}</td>
                  <td className="px-4 py-2.5">{inr(f.totalFee)}</td>
                  <td className="px-4 py-2.5 text-green-600">{inr(f.paid)}</td>
                  <td className="px-4 py-2.5 font-bold text-red-600">{inr(f.pending)}</td>
                </tr>
              ))}
              {owing.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[color:var(--text-faint)]">
                    No pending dues. Set a fee on a student to start tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent payments */}
      <div className="overflow-hidden panel">
        <div className="border-b border-line px-4 py-3 text-sm font-bold text-[color:var(--text)]">
          Recent Payments
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Student</th>
                <th className="px-4 py-2.5 font-semibold">Purpose</th>
                <th className="px-4 py-2.5 font-semibold">Method</th>
                <th className="px-4 py-2.5 font-semibold">Amount</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.slice(0, 25).map((p) => (
                <tr key={p.id} className="hover:bg-accent/[0.04]">
                  <td className="px-4 py-2.5 text-[color:var(--text-muted)]">{p.paidOn}</td>
                  <td className="px-4 py-2.5 font-semibold text-[color:var(--text)]">{p.studentName}</td>
                  <td className="px-4 py-2.5">{p.purpose}</td>
                  <td className="px-4 py-2.5 text-[color:var(--text-muted)]">{p.method}</td>
                  <td className="px-4 py-2.5 font-bold text-green-600">{inr(p.amount)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Delete this ${inr(p.amount)} payment?`)) onDelete(p.id);
                      }}
                      className="text-xs font-semibold text-[color:var(--text-faint)] hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[color:var(--text-faint)]">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <PaymentModal
          students={students}
          onClose={() => setShowAdd(false)}
          onSave={onAdd}
        />
      )}
      {showFee && (
        <PaymentModal
          students={students}
          feeMode
          onClose={() => setShowFee(false)}
          onSave={onAdd}
        />
      )}
    </div>
  );
}

function PaymentModal({
  students,
  feeMode,
  onClose,
  onSave,
}: {
  students: Student[];
  feeMode?: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<{ error?: string }>;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [purpose, setPurpose] = useState("Application");
  const [paidOn, setPaidOn] = useState(TODAY);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    const body = feeMode
      ? { studentId, totalFee: Number(amount) }
      : { studentId, amount: Number(amount), method, purpose, paidOn, note };
    const r = await onSave(body);
    setBusy(false);
    if (r?.error) setError(r.error);
    else onClose();
  }

  return (
    <Modal title={feeMode ? "Set Total Fee" : "Record Payment"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Student">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </Field>

        <Field label={feeMode ? "Total agreed fee (₹)" : "Amount received (₹)"}>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 85000"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </Field>

        {!feeMode && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Purpose">
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                >
                  {["Consultation", "Application", "Coaching", "Visa Fee", "Other"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Method">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                >
                  {["Cash", "UPI", "Bank Transfer", "Card", "Cheque"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Received on">
              <input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </Field>
            <Field label="Note (optional)">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. 2nd instalment"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </Field>
          </>
        )}

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
            disabled={busy || !studentId || !amount}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-40"
          >
            {busy ? "Saving…" : feeMode ? "Save fee" : "Record payment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================================
// TESTS  — weekly / sessional practice scores, whole exam or one section
// =========================================================================
function Tests({ students }: { students: Student[] }) {
  const [tests, setTests] = useState<TestRec[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState("All");

  async function load() {
    setLoading(true);
    try {
      const d = await fetch("/api/tests").then((r) => r.json());
      if (Array.isArray(d.tests)) setTests(d.tests);
      if (Array.isArray(d.progress)) setProgress(d.progress);
    } catch {
      /* leave the lists empty; the page still renders */
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this test record?")) return;
    await fetch(`/api/tests/${id}`, { method: "DELETE" });
    load();
  }

  const shown =
    filterStudent === "All"
      ? tests
      : tests.filter((t) => t.studentId === filterStudent);

  // Latest score per section, for whoever is selected.
  const cards = progress.filter(
    (p) => filterStudent === "All" || p.studentId === filterStudent
  );
  const bySection = SECTIONS.map((sec) => {
    const rows = cards.filter((c) => c.section === sec);
    if (!rows.length) return null;
    const avg = rows.reduce((a, r) => a + (r.latest / r.maxScore) * 100, 0) / rows.length;
    return { section: sec, avg: Math.round(avg), count: rows.length };
  }).filter(Boolean) as { section: string; avg: number; count: number }[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          <option value="All">All students</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
        >
          + Record Test
        </button>
      </div>

      {bySection.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {bySection.map((b) => (
            <div key={b.section} className="panel p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-faint)]">
                {b.section}
              </div>
              <div
                className={`mt-1 font-display text-2xl font-extrabold ${
                  b.avg >= 70 ? "text-green-600" : b.avg >= 50 ? "text-amber-600" : "text-red-600"
                }`}
              >
                {b.avg}%
              </div>
              <div className="text-xs text-[color:var(--text-muted)]">
                latest, {b.count} student{b.count === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-sunk text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-faint)]">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((t) => {
                const pct = Math.round((t.score / t.maxScore) * 100);
                return (
                  <tr key={t.id} className="hover:bg-accent/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 text-[color:var(--text-muted)]">{t.takenOn}</td>
                    <td className="px-4 py-3 font-semibold text-[color:var(--text)]">{t.studentName}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--text-muted)]">
                        {t.exam} · {t.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3">{t.section}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold ${
                          pct >= 70 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {t.score}
                      </span>
                      <span className="text-xs text-[color:var(--text-faint)]"> / {t.maxScore}</span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-[color:var(--text-muted)]">{t.note}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(t.id)}
                        className="text-xs font-semibold text-[color:var(--text-faint)] hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">
                    No test records yet — add the first one above.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddTestModal
          students={students}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

const SECTIONS = ["Overall", "Speaking", "Writing", "Reading", "Listening"];

function AddTestModal({
  students,
  onClose,
  onSaved,
}: {
  students: Student[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [exam, setExam] = useState("PTE");
  const [kind, setKind] = useState("Weekly");
  const [section, setSection] = useState("Speaking");
  const [score, setScore] = useState("");
  const [takenOn, setTakenOn] = useState(TODAY);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const maxScore = exam === "PTE" ? 90 : 9;

  async function save() {
    setBusy(true);
    setError("");
    const r = await api("/api/tests", "POST", {
      studentId, exam, kind, section,
      score: Number(score), maxScore, takenOn, note,
    });
    setBusy(false);
    if (r?.error) setError(r.error);
    else onSaved();
  }

  return (
    <Modal title="Record Test Score" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Student">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Exam">
            <select
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option>PTE</option>
              <option>IELTS</option>
            </select>
          </Field>
          <Field label="Test type">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {["Weekly", "Sessional", "Mock", "Practice"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Section">
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSection(sec)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  section === sec
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Score (out of ${maxScore})`}>
            <input
              type="number"
              step={exam === "PTE" ? 1 : 0.5}
              min="0"
              max={maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label="Taken on">
            <input
              type="date"
              value={takenOn}
              onChange={(e) => setTakenOn(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
        </div>

        <Field label="Note (optional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. fluency improving, needs pronunciation work"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </Field>

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
            disabled={busy || !studentId || score === ""}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save score"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================================
// ATTENDANCE — mark a whole batch for one day, and see each student's rate
// =========================================================================
const ATT_STATUSES = ["Present", "Absent", "Late", "Leave"] as const;

function Attendance({ students }: { students: Student[] }) {
  const [date, setDate] = useState(TODAY);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<AttSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  async function load(d: string) {
    setLoading(true);
    setSaved("");
    try {
      const r = await fetch(`/api/attendance?date=${d}`).then((x) => x.json());
      const m: Record<string, string> = {};
      for (const rec of r.records ?? []) m[rec.studentId] = rec.status;
      setMarks(m);
      if (Array.isArray(r.summary)) setSummary(r.summary);
    } catch {
      /* keep whatever is on screen */
    }
    setLoading(false);
  }
  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function set(studentId: string, status: string) {
    setMarks((m) => ({ ...m, [studentId]: status }));
    setSaved("");
  }

  function markAll(status: string) {
    const m: Record<string, string> = {};
    for (const s of students) m[s.id] = status;
    setMarks(m);
    setSaved("");
  }

  async function save() {
    setSaving(true);
    const entries = Object.entries(marks).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    const r = await api("/api/attendance", "POST", { date, entries });
    setSaving(false);
    setSaved(r?.error ? r.error : `Saved ${r.saved?.length ?? 0} students for ${date}.`);
    load(date);
  }

  const counts = ATT_STATUSES.map((st) => ({
    st,
    n: Object.values(marks).filter((v) => v === st).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => markAll("Present")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Mark all present
        </button>
        <button
          onClick={save}
          disabled={saving || Object.keys(marks).length === 0}
          className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save attendance"}
        </button>
        {counts.map((c) => (
          <span key={c.st} className="text-xs text-[color:var(--text-muted)]">
            {c.st}: <b className="text-slate-700">{c.n}</b>
          </span>
        ))}
      </div>

      {saved && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {saved}
        </div>
      )}

      <div className="overflow-hidden panel">
        <div className="border-b border-line px-4 py-3 text-sm font-bold text-[color:var(--text)]">
          Mark attendance · {date}
        </div>
        <div className="divide-y divide-line">
          {students.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[color:var(--text)]">{s.name}</div>
                <div className="text-xs text-[color:var(--text-faint)]">{s.id}</div>
              </div>
              <div className="flex gap-1.5">
                {ATT_STATUSES.map((st) => {
                  const on = marks[s.id] === st;
                  const tone =
                    st === "Present" ? "bg-green-500" :
                    st === "Absent" ? "bg-red-500" :
                    st === "Late" ? "bg-amber-500" : "bg-slate-500";
                  return (
                    <button
                      key={st}
                      onClick={() => set(s.id, st)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        on
                          ? `${tone} text-white`
                          : "bg-white text-[color:var(--text-muted)] ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">
              No students to mark.
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden panel">
        <div className="border-b border-line px-4 py-3 text-sm font-bold text-[color:var(--text)]">
          Attendance Record
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <th className="px-4 py-2.5 font-semibold">Student</th>
                <th className="px-4 py-2.5 font-semibold">Present</th>
                <th className="px-4 py-2.5 font-semibold">Absent</th>
                <th className="px-4 py-2.5 font-semibold">Late</th>
                <th className="px-4 py-2.5 font-semibold">Leave</th>
                <th className="px-4 py-2.5 font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {summary.map((a) => (
                <tr key={a.studentId} className="hover:bg-accent/[0.04]">
                  <td className="px-4 py-2.5 font-semibold text-[color:var(--text)]">{a.studentName}</td>
                  <td className="px-4 py-2.5 text-green-600">{a.present}</td>
                  <td className="px-4 py-2.5 text-red-600">{a.absent}</td>
                  <td className="px-4 py-2.5 text-amber-600">{a.late}</td>
                  <td className="px-4 py-2.5 text-[color:var(--text-muted)]">{a.leave}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`font-bold ${
                        a.percent >= 75 ? "text-green-600" : a.percent >= 50 ? "text-amber-600" : "text-red-600"
                      }`}
                    >
                      {a.percent}%
                    </span>
                    <span className="text-xs text-[color:var(--text-faint)]"> of {a.total}</span>
                  </td>
                </tr>
              ))}
              {!loading && summary.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[color:var(--text-faint)]">
                    No attendance marked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// DOCUMENTS — upload once, download whenever it is needed
// =========================================================================
const DOC_KIND_LIST = [
  "Passport", "Photo", "Academics", "Score Report",
  "Offer Letter", "Funds Proof", "Visa", "Other",
];

function fileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Documents({ students }: { students: Student[] }) {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [viewing, setViewing] = useState<DocMeta | null>(null);

  async function load() {
    setLoading(true);
    try {
      const d = await fetch("/api/documents").then((r) => r.json());
      if (Array.isArray(d.documents)) setDocs(d.documents);
    } catch {
      /* leave the list as-is */
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(d: DocMeta) {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    await fetch(`/api/documents/${d.id}`, { method: "DELETE" });
    load();
  }

  const shown =
    filterStudent === "All" ? docs : docs.filter((d) => d.studentId === filterStudent);
  const totalSize = shown.reduce((a, d) => a + d.size, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          <option value="All">All students</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowUpload(true)}
          className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
        >
          + Upload Document
        </button>
        <span className="text-xs text-[color:var(--text-muted)]">
          {shown.length} file{shown.length === 1 ? "" : "s"} · {fileSize(totalSize)}
        </span>
      </div>

      <div className="overflow-hidden panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-sunk text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--text-faint)]">
                <th className="px-4 py-3 font-semibold">File</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Uploaded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((d) => (
                <tr key={d.id} className="hover:bg-accent/[0.04]">
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="truncate font-semibold text-[color:var(--text)]">{d.name}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.studentName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--text-muted)]">
                      {d.kind}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[color:var(--text-muted)]">
                    {fileSize(d.size)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[color:var(--text-faint)]">
                    {d.uploadedAt.slice(0, 10)} · {d.uploadedBy}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {canPreview(d.mime) && (
                      <button
                        onClick={() => setViewing(d)}
                        className="mr-2 rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent"
                      >
                        View
                      </button>
                    )}
                    <a
                      href={`/api/documents/${d.id}`}
                      className="rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => remove(d)}
                      className="ml-2 text-xs font-semibold text-[color:var(--text-faint)] hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">
                    No documents yet — upload a passport, offer letter or score
                    report and it will be here whenever you need it.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <ViewerModal doc={viewing} onClose={() => setViewing(null)} />}

      {showUpload && (
        <UploadModal
          students={students}
          preselect={filterStudent === "All" ? undefined : filterStudent}
          onClose={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function UploadModal({
  students,
  preselect,
  onClose,
  onDone,
}: {
  students: Student[];
  preselect?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [studentId, setStudentId] = useState(preselect ?? students[0]?.id ?? "");
  const [kind, setKind] = useState("Passport");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("studentId", studentId);
    fd.append("kind", kind);
    fd.append("file", file);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const d = await res.json();
      if (d.error) setError(d.error);
      else onDone();
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  return (
    <Modal title="Upload Document" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Student">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Document type">
          <div className="flex flex-wrap gap-2">
            {DOC_KIND_LIST.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  kind === k
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </Field>

        <Field label="File">
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError("");
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
          />
          <span className="mt-1 block text-[11px] text-[color:var(--text-faint)]">
            PDF, JPG or PNG works best. Up to 5 MB per file.
          </span>
        </Field>

        {file && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {file.name} · {fileSize(file.size)}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={upload}
            disabled={busy || !file || !studentId}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-40"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Types the server will render inline; everything else downloads instead. */
function canPreview(mime: string): boolean {
  return ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"].includes(
    mime
  );
}

function ViewerModal({ doc, onClose }: { doc: DocMeta; onClose: () => void }) {
  const src = `/api/documents/${doc.id}?view=1`;
  const isImage = doc.mime.startsWith("image/");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 p-2 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-[color:var(--text)]">{doc.name}</div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {doc.studentName} · {doc.kind} · {fileSize(doc.size)}
            </div>
          </div>
          <a
            href={`/api/documents/${doc.id}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--text-faint)] hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100">
          {isImage ? (
            <div className="flex min-h-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={doc.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <iframe src={src} title={doc.name} className="h-full w-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}
