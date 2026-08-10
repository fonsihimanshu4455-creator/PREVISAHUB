"use client";

import { useEffect, useState } from "react";
// The same CRM board the admin sees; the server scopes the data per role.
import CrmBoard from "@/components/crm/CrmBoard";
import CallingPanel from "@/components/crm/CallingPanel";

type Staff = { id: string; name: string; username: string; role?: string };

export default function StaffPortal() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/staff-session")
      .then((r) => r.json())
      .then((d) => setStaff(d.role === "staff" ? d.staff : null))
      .catch(() => setStaff(null))
      .finally(() => setReady(true));
  }, []);

  async function logout() {
    await fetch("/api/staff-logout", { method: "POST" });
    setStaff(null);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        Loading…
      </div>
    );
  }

  if (!staff) return <StaffLogin onLogin={setStaff} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔶</span>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-slate-800">
                Pre Visa Hub
              </div>
              <div className="text-[10px] tracking-widest text-slate-400">
                {staff.role === "telecaller" ? "CALLING PANEL" : "STAFF PORTAL"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {staff.name}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <StaffWork staff={staff} />
      </main>
    </div>
  );
}

function StaffLogin({ onLogin }: { onLogin: (s: Staff) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) onLogin(data.staff);
      else setError(data.error || "Wrong username or password.");
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5 text-center">
          <div className="text-3xl">🔶</div>
          <h1 className="mt-2 font-display text-xl font-bold text-slate-800">
            Staff Login
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to see the students assigned to you.
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            Username
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            placeholder="e.g. neha"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </label>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Login"}
        </button>

        <p className="mt-5 text-center text-xs text-slate-400">
          Owner?{" "}
          <a href="/admin" className="font-semibold text-orange-600 hover:underline">
            Admin login
          </a>
        </p>
      </form>
    </div>
  );
}

// The staff view of the CRM: their own students only. The server already
// scopes the data, so this renders whatever it is given.
function StaffWork({ staff }: { staff: Staff }) {
  const telecaller = staff.role === "telecaller";
  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-slate-800">
          {telecaller ? "My Calling List" : "My Students"}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {telecaller
            ? `Numbers assigned to ${staff.name}`
            : `Students assigned to ${staff.name}`}
        </p>
      </div>
      {telecaller ? <CallingPanel /> : <CrmBoard showHeader={false} />}
    </div>
  );
}
