"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COUNTRIES,
  Country,
  formatScore,
  isIeltsPass,
  priorityColor,
  relativeDue,
  stageColor,
  Student,
  Task,
  TestType,
  TODAY,
  VISA_STAGES,
  VisaStage,
} from "@/lib/crm-data";

type View = "dashboard" | "students" | "pipeline" | "tasks";

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

export default function CrmPage() {
  const [view, setView] = useState<View>("dashboard");
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<"db" | "demo" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rs, rt] = await Promise.all([
          fetch("/api/students").then((r) => r.json()),
          fetch("/api/tasks").then((r) => r.json()),
        ]);
        if (!alive) return;
        if (rs.error) {
          setError(rs.detail || rs.error);
          setMode("demo");
          return;
        }
        if (Array.isArray(rs.students)) setStudents(rs.students);
        if (Array.isArray(rt.tasks)) setTasks(rt.tasks);
        setMode(rs.mode === "db" ? "db" : "demo");
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

  const pendingTasks = tasks.filter((t) => !t.done && t.due <= TODAY).length;

  const tabs: { key: View; label: string; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "students", label: "Students" },
    { key: "pipeline", label: "Visa Pipeline" },
    { key: "tasks", label: "Daily Tasks", badge: pendingTasks },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Student CRM 🎓
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{TODAY_LABEL}</p>
        </div>
        {mode === "db" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Live · Database
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            {mode === "loading" ? "Connecting…" : "Demo data"}
          </span>
        )}
      </div>

      {/* Setup hint when there is no database yet */}
      {mode === "demo" && <SetupPanel error={error} />}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              view === t.key
                ? "border-b-2 border-orange-500 text-orange-600"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {!!t.badge && t.badge > 0 && (
              <span className="rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === "dashboard" && <Dashboard students={students} onGoto={setView} />}
      {view === "students" && (
        <Students students={students} onAdd={addStudent} onUpdate={updateStudent} />
      )}
      {view === "pipeline" && <Pipeline students={students} onMove={moveStudent} />}
      {view === "tasks" && <Tasks tasks={tasks} onToggle={toggleTask} />}
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
    { label: "Total Students", value: total, sub: "in pipeline", tone: "text-slate-800" },
    { label: "Visas Approved", value: approved, sub: "success stories", tone: "text-green-600" },
    { label: "In Progress", value: inProgress, sub: "active applications", tone: "text-orange-500" },
    { label: "New Leads", value: newLeads, sub: "awaiting counselling", tone: "text-violet-600" },
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
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {k.label}
            </div>
            <div className={`mt-1 font-display text-3xl font-extrabold ${k.tone}`}>
              {k.value}
            </div>
            <div className="text-xs text-slate-500">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800">Students by Visa Stage</h3>
            <button
              onClick={() => onGoto("pipeline")}
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              View pipeline →
            </button>
          </div>
          <div className="space-y-3">
            {stageCounts.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs font-medium text-slate-600">{s.stage}</div>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-slate-600 to-slate-800 px-2 text-[11px] font-bold text-white transition-all"
                    style={{ width: `${(s.count / maxStage) * 100}%` }}
                  >
                    {s.count > 0 && s.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-display font-bold text-slate-800">IELTS / PTE Readiness</h3>
          <div className="flex justify-center">
            <ProgressRing percent={passRate} />
          </div>
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Test takers</span>
              <span className="font-semibold text-slate-800">{testTakers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target achieved</span>
              <span className="font-semibold text-green-600">{passing}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Still preparing</span>
              <span className="font-semibold text-orange-500">
                {testTakers.length - passing}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800">
              Today&apos;s Follow-ups
              <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
                {todaysFollowUps.length}
              </span>
            </h3>
            <button
              onClick={() => onGoto("students")}
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              All students →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {todaysFollowUps.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                All caught up — no follow-ups pending 🎉
              </p>
            )}
            {todaysFollowUps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{s.name}</div>
                  <div className="truncate text-xs text-slate-500">{s.notes}</div>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-display font-bold text-slate-800">By Destination</h3>
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
                  <span className="w-5 text-right text-sm font-bold text-slate-800">
                    {c.count}
                  </span>
                </div>
              ))}
            {countryCounts.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No students yet.</p>
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
  onAdd,
  onUpdate,
}: {
  students: Student[];
  onAdd: (input: NewStudentInput) => void | Promise<void>;
  onUpdate: (id: string, patch: Partial<Student>) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<VisaStage | "All">("All");
  const [countryFilter, setCountryFilter] = useState<Country | "All">("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.phone.includes(q);
      const matchesStage = stageFilter === "All" || s.stage === stageFilter;
      const matchesCountry = countryFilter === "All" || s.country === countryFilter;
      return matchesQuery && matchesStage && matchesCountry;
    });
  }, [students, query, stageFilter, countryFilter]);

  function saveStudent(updated: Student) {
    onUpdate(updated.id, {
      stage: updated.stage,
      testType: updated.testType,
      score: updated.score,
      nextFollowUp: updated.nextFollowUp,
      notes: updated.notes,
    });
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID, city, phone…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as VisaStage | "All")}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
        >
          <option value="All">All stages</option>
          {VISA_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value as Country | "All")}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
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
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
        >
          + Add Student
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Test / Score</th>
                <th className="px-4 py-3 font-semibold">Visa Stage</th>
                <th className="px-4 py-3 font-semibold">Follow-up</th>
                <th className="px-4 py-3 font-semibold">Counsellor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="transition hover:bg-orange-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} />
                      <div>
                        <div className="font-semibold text-slate-800">{s.name}</div>
                        <div className="text-xs text-slate-400">
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
                    <div className="text-xs text-slate-400">{s.intake}</div>
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
                        s.nextFollowUp <= TODAY ? "text-red-600" : "text-slate-500"
                      }`}
                    >
                      {relativeDue(s.nextFollowUp)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.counsellor}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-600"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    {students.length === 0
                      ? "No students yet — add your first one above."
                      : "No students match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
          Showing {filtered.length} of {students.length} students
        </div>
      </div>

      {showAdd && (
        <AddStudentModal
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
          onClose={() => setEditing(null)}
          onSave={saveStudent}
        />
      )}
    </div>
  );
}

function ScoreCell({ student }: { student: Student }) {
  if (student.testType === "Not Taken" || student.score === null) {
    return <span className="text-xs italic text-slate-400">Not taken yet</span>;
  }
  const pass = isIeltsPass(student);
  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
        {student.testType}
      </span>
      <span className={`font-bold ${pass ? "text-green-600" : "text-orange-500"}`}>
        {formatScore(student)}
      </span>
      <span className="text-xs text-slate-400">
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
      <p className="mb-4 text-sm text-slate-500">
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
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {s.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {countryFlag(s.country)} {s.country}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {s.testType !== "Not Taken"
                            ? `${s.testType} ${formatScore(s)}`
                            : "No test"}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onMove(s, -1)}
                            disabled={idx === 0}
                            className="rounded-md border border-slate-200 px-1.5 text-xs text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                            title="Move back"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => onMove(s, 1)}
                            disabled={idx === VISA_STAGES.length - 1}
                            className="rounded-md border border-slate-200 px-1.5 text-xs text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-800">Today&apos;s Progress</h3>
            <p className="text-xs text-slate-500">
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
            className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition ${
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
                  t.done ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {t.title}
              </div>
              <div className="text-xs text-slate-400">
                {t.studentName} · {relativeDue(t.due)}
              </div>
            </div>
            <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 sm:inline">
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
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
  onClose,
  onSave,
}: {
  student: Student;
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
            <div className="font-semibold text-slate-800">{student.name}</div>
            <div className="text-xs text-slate-500">
              {student.id} · {student.phone}
            </div>
          </div>
        </div>

        <Field label="Visa Stage">
          <select
            value={draft.stage}
            onChange={(e) => setDraft({ ...draft, stage: e.target.value as VisaStage })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 disabled:bg-slate-50"
            />
          </Field>
        </div>

        <Field label="Next Follow-up">
          <input
            type="date"
            value={draft.nextFollowUp}
            onChange={(e) => setDraft({ ...draft, nextFollowUp: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
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
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddStudentModal({
  onClose,
  onAdd,
}: {
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </Field>
          <Field label="Phone / WhatsApp *">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 …"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </Field>
          <Field label="City">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ludhiana"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </Field>
          <Field label="Destination">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as Country)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Assign Counsellor">
          <select
            value={counsellor}
            onChange={(e) => setCounsellor(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          >
            <option>Rohit Sharma</option>
            <option>Neha Gupta</option>
          </select>
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
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
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
          <h3 className="font-display text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
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
  const colors = [
    "bg-slate-700",
    "bg-orange-500",
    "bg-violet-500",
    "bg-cyan-600",
    "bg-emerald-600",
    "bg-rose-500",
  ];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${color} ${
        big ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs"
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
          stroke="#f97316"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold text-slate-800">{percent}%</span>
        <span className="text-[10px] font-semibold text-slate-400">on target</span>
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
