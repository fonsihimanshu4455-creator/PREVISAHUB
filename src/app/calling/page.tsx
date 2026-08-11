"use client";

import { useEffect, useState } from "react";
import CallingPanel from "@/components/crm/CallingPanel";
import StaffLogin, { StaffAccount } from "@/components/staff/StaffLogin";
import Icon from "@/components/admin/Icon";

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
      <div className="flex min-h-screen items-center justify-center bg-ground text-[color:var(--text-faint)]">
        Loading…
      </div>
    );
  }

  if (!staff) {
    return (
      <StaffLogin
        expect="telecaller"
        icon="phone"
        title="Calling Panel"
        subtitle="Sign in to see the numbers assigned to you."
        otherLabel="Counsellor?"
        otherHref="/staff"
        onLogin={setStaff}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ground">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon name="phone" className="h-4 w-4" strokeWidth={2} /></span>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-[color:var(--text)]">
                Pre Visa Hub
              </div>
              <div className="text-[10px] tracking-widest text-[color:var(--text-faint)]">
                CALLING PANEL
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[color:var(--text-muted)] sm:inline">{staff.name}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)] transition hover:bg-ground"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold text-[color:var(--text)]">
            My Calling List
          </h1>
          <p className="mt-0.5 text-sm text-[color:var(--text-muted)]">
            Numbers assigned to {staff.name}
          </p>
        </div>
        <CallingPanel />
      </main>
    </div>
  );
}
