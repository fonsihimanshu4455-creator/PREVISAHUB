"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";
import { adminNav, adminNavGroups } from "@/lib/adminNav";
import LoginScreen from "@/components/admin/LoginScreen";
import Icon from "@/components/admin/Icon";

export default function AdminShell({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: { authed: boolean; storage: boolean };
}) {
  const { authed, ready, login, logout } = useAdminAuth(initial);
  const pathname = usePathname();
  const currentTab = useSearchParams().get("tab") ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const websiteHrefs = adminNav
    .filter((i) => i.group === "Website")
    .map((i) => i.href);
  const onWebsitePage = websiteHrefs.some((h) => pathname.startsWith(h));
  const [websiteOpen, setWebsiteOpen] = useState(onWebsitePage);
  const studentHrefs = adminNav
    .filter((i) => i.group === "Students")
    .map((i) => i.href.split("?")[0]);
  const onStudentPage = studentHrefs.some((h) => pathname.startsWith(h));
  const [studentsOpen, setStudentsOpen] = useState(true);

  useEffect(() => {
    if (onStudentPage) setStudentsOpen(true);
  }, [onStudentPage]);

  // The layout persists across navigation, so opening a website page from
  // elsewhere has to expand the group too — not just a fresh page load.
  useEffect(() => {
    if (onWebsitePage) setWebsiteOpen(true);
  }, [onWebsitePage]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-ground text-[color:var(--text)] lg:flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] transform flex-col bg-ink-900 text-slate-300 transition-transform duration-300 lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[60px] items-center gap-2.5 border-b border-white/[0.07] px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Icon name="logo" className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
          <div className="leading-none">
            <div className="font-display text-[13.5px] font-bold text-white">
              Pre Visa Hub
            </div>
            <div className="mt-1 text-[9.5px] font-semibold tracking-[0.16em] text-slate-500">
              CONSOLE
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          {adminNavGroups.map((group) => {
            const items = adminNav.filter((i) => i.group === group);
            if (!items.length) return null;

            const link = (item: (typeof adminNav)[number]) => {
              // Entries like /admin/crm?tab=tests share a pathname, so the
              // active one is decided by the tab as well as the path.
              const [itemPath, itemQuery = ""] = item.href.split("?");
              const itemTab = new URLSearchParams(itemQuery).get("tab") ?? "";
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : itemPath === "/admin/crm"
                  ? pathname === "/admin/crm" && currentTab === itemTab
                  : pathname.startsWith(itemPath);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // The root layout reads site content from the database on
                  // every render, so prefetching all the sidebar links would
                  // fire a server render (and a query) each, per page view.
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  className={`group relative flex items-center gap-2.5 rounded-lg py-[7px] pl-3 pr-2.5 text-[13.5px] transition-colors duration-150 ${
                    active
                      ? "bg-white/[0.07] font-semibold text-white"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r bg-accent transition-all duration-200 ${
                      active ? "opacity-100" : "h-0 opacity-0"
                    }`}
                  />
                  <Icon
                    name={item.icon}
                    className={`h-[17px] w-[17px] shrink-0 transition-colors ${
                      active ? "text-accent" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            };

            // Website editing is eleven pages that are visited occasionally,
            // so they collapse into one entry instead of burying the daily
            // student work below a long list.
            if (group === "Students" || group === "Website") {
              const isWebsite = group === "Website";
              const open = isWebsite ? websiteOpen : studentsOpen;
              const toggle = () =>
                isWebsite ? setWebsiteOpen((o) => !o) : setStudentsOpen((o) => !o);
              return (
                <div key={group} className="pt-2">
                  <button
                    onClick={toggle}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2.5 rounded-lg py-[7px] pl-3 pr-2.5 text-[13.5px] text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
                  >
                    <Icon
                      name={isWebsite ? "globe" : "students"}
                      className="h-[17px] w-[17px] shrink-0 text-slate-500"
                    />
                    <span className="font-semibold">
                      {isWebsite ? "Edit Website" : "Students"}
                    </span>
                    <span className="ml-auto tabular-nums text-[10px] text-slate-600">
                      {items.length}
                    </span>
                    <Icon
                      name="chevron"
                      className={`h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                      strokeWidth={2.4}
                    />
                  </button>
                  {open && (
                    <div className="mt-0.5 space-y-0.5 border-l border-white/[0.07] pl-2 animate-fade">
                      {items.map(link)}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={group} className="pb-1">
                {/* "Main" is a single item, so a heading over it would be noise. */}
                {group !== "Main" && (
                  <div className="px-3 pb-1.5 pt-3 text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    {group}
                  </div>
                )}
                {items.map(link)}
              </div>
            );
          })}
        </nav>
        <div className="space-y-0.5 border-t border-white/[0.07] p-2.5">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
          >
            <Icon name="globe" className="h-[17px] w-[17px] text-slate-500" /> View website
          </a>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-rose-300"
          >
            <Icon name="logout" className="h-[17px] w-[17px] text-slate-500" /> Logout
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-display text-[15px] font-bold">Pre Visa Hub</span>
        </header>
        {/* The CRM has wide tables and a kanban board, so it gets more room
            than the content-editing pages. */}
        <main
          className={`mx-auto p-4 sm:p-7 ${
            /^\/admin\/(crm|sales|import|staff)/.test(pathname) ? "max-w-7xl" : "max-w-4xl"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
