"use client";

import { useEffect, useState } from "react";
import CallingPanel from "@/components/crm/CallingPanel";
import StaffLogin, { StaffAccount } from "@/components/staff/StaffLogin";

/**
 * The telecallers' own entrance. Separate from /staff so a caller has one URL
 * to remember and never sees the counsellor side; the login itself rejects
 * accounts of the other kind.
 */
export default function CallingPage() {
  const [staff, setStaff] = useState<StaffAccount | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/staff-session")
      .then((r) => r.json())
      .then((d) =>
        setStaff(d.role === "staff" && d.staff?.role === "telecaller" ? d.staff : null)
      )
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

  if (!staff) {
    return (
      <StaffLogin
        expect="telecaller"
        icon="📞"
        title="Calling Panel"
        subtitle="Sign in to see the numbers assigned to you."
        otherLabel="Counsellor?"
        otherHref="/staff"
        onLogin={setStaff}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">📞</span>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-slate-800">
                Pre Visa Hub
              </div>
              <div className="text-[10px] tracking-widest text-slate-400">
                CALLING PANEL
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{staff.name}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold text-slate-800">
            My Calling List
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Numbers assigned to {staff.name}
          </p>
        </div>
        <CallingPanel />
      </main>
    </div>
  );
}
