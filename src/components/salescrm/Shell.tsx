"use client";

// ---------------------------------------------------------------------------
// The sales CRM shell: sidebar, top bar, quick actions, and the session.
//
// The navigation is built from the permissions the server sent, so a sales
// executive is not shown a Reports link that would 403 — but the links are the
// courtesy, not the control: every route checks the permission again.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CrmRole } from "@/lib/leads/types";
import StaffLogin from "@/components/staff/StaffLogin";

export type Permissions = {
  seesEveryone: boolean;
  canEdit: boolean;
  canAssign: boolean;
  canDelete: boolean;
  canCall: boolean;
  canBook: boolean;
  seesMoney: boolean;
  editsMoney: boolean;
  seesReports: boolean;
  managesStaff: boolean;
};

export type CrmMe = {
  user: { name: string; role: CrmRole; label: string; scope: string };
  permissions: Permissions;
  team: { id: string; name: string; role: CrmRole }[];
};

const Ctx = createContext<CrmMe | null>(null);

/** The signed-in user and what they may do. Null only while loading. */
export function useCrm(): CrmMe {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrm outside the CRM shell");
  return v;
}

type NavItem = { href: string; label: string; show: (p: Permissions) => boolean };

const NAV: NavItem[] = [
  { href: "/crm", label: "Dashboard", show: () => true },
  { href: "/crm/leads", label: "Leads", show: () => true },
  { href: "/crm/calling", label: "Calling", show: (p) => p.canCall },
  { href: "/crm/followups", label: "Follow-ups", show: () => true },
  { href: "/crm/pipeline", label: "Pipeline", show: () => true },
  { href: "/crm/appointments", label: "Appointments", show: (p) => p.canBook },
  { href: "/crm/sales", label: "Sales & Payments", show: (p) => p.seesMoney },
  { href: "/crm/reports", label: "Reports", show: (p) => p.seesReports },
  { href: "/crm/team", label: "Team", show: (p) => p.seesEveryone },
];

/**
 * `initial` comes from the server on the very first render, so the shell never
 * has to ask who is signed in before it can paint. It only re-fetches after a
 * login, when the answer has genuinely changed.
 */
export default function Shell({
  initial,
  children,
}: {
  initial: CrmMe | null;
  children: React.ReactNode;
}) {
  const [me, setMe] = useState<CrmMe | null>(initial);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const path = usePathname();
  const router = useRouter();

  const load = useCallback(() => {
    fetch("/api/crm/session")
      .then((r) => r.json())
      .then((d) => setMe(d?.user ? (d as CrmMe) : null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => setOpen(false), [path]);

  if (!me) {
    return (
      <StaffLogin
        title="Sales CRM"
        subtitle="Sign in with your CRM account."
        otherLabel="Owner?"
        otherHref="/admin"
        onLogin={load}
      />
    );
  }

  const nav = NAV.filter((n) => n.show(me.permissions));

  return (
    <Ctx.Provider value={me}>
      <div className="min-h-screen bg-surface-sunk">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 flex-col border-r border-[#1f2c46] bg-[color:var(--ink-900)] text-slate-300 transition-transform lg:flex lg:translate-x-0 ${
            open ? "flex translate-x-0" : "hidden -translate-x-full"
          }`}
        >
          <div className="flex items-center gap-2.5 border-b border-[#1f2c46] px-4 py-4">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-display text-sm font-bold text-white">
              PV
            </span>
            <div className="leading-tight">
              <div className="font-display text-[13.5px] font-bold text-white">Pre Visa Hub</div>
              <div className="text-[9.5px] tracking-[0.18em] text-slate-500">SALES CRM</div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2.5">
            {nav.map((n) => {
              const active = n.href === "/crm" ? path === "/crm" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  prefetch={false}
                  className={`mb-0.5 block rounded-lg px-3 py-2 text-[13.5px] font-medium transition ${
                    active
                      ? "bg-[color:var(--ink-700)] text-white"
                      : "text-slate-400 hover:bg-[color:var(--ink-800)] hover:text-slate-100"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#1f2c46] p-2.5">
            <Link
              href="/admin"
              prefetch={false}
              className="block rounded-lg px-3 py-2 text-[13px] text-slate-400 transition hover:bg-[color:var(--ink-800)] hover:text-slate-100"
            >
              Case management →
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/staff-logout", { method: "POST" });
                setMe(null);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-slate-400 transition hover:bg-[color:var(--ink-800)] hover:text-slate-100"
            >
              Log out
            </button>
          </div>
        </aside>

        {/* Top bar */}
        <div className="lg:pl-60">
          <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
              <button
                onClick={() => setOpen((v) => !v)}
                className="rounded-lg border border-line-strong px-2.5 py-1.5 text-sm lg:hidden"
                aria-label="Menu"
              >
                ☰
              </button>

              <form
                className="relative flex-1 max-w-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(`/crm/leads?q=${encodeURIComponent(search)}`);
                }}
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, lead ID…"
                  className="w-full rounded-xl border border-line-strong bg-surface-sunk px-3.5 py-2 text-[13.5px] outline-none transition focus:border-accent focus:bg-white"
                />
              </form>

              <div className="ml-auto flex items-center gap-2">
                {me.permissions.canEdit && (
                  <Link
                    href="/crm/leads?new=1"
                    prefetch={false}
                    className="rounded-xl bg-accent px-3 py-2 text-[13px] font-semibold text-white transition hover:brightness-95"
                  >
                    + Lead
                  </Link>
                )}
                {me.permissions.canCall && (
                  <Link
                    href="/crm/calling"
                    prefetch={false}
                    className="hidden rounded-xl border border-line-strong px-3 py-2 text-[13px] font-semibold text-[color:var(--text-muted)] transition hover:border-accent hover:text-accent sm:block"
                  >
                    Call queue
                  </Link>
                )}
                <div className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[color:var(--brand)] text-[10px] font-bold text-white">
                    {me.user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="hidden leading-tight sm:block">
                    <div className="text-[12.5px] font-semibold">{me.user.name}</div>
                    <div className="text-[10px] text-[color:var(--text-faint)]">
                      {me.user.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
