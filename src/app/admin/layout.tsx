"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/lib/adminAuth";
import { adminNav, adminNavGroups } from "@/lib/adminNav";
import LoginScreen from "@/components/admin/LoginScreen";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { authed, ready, login, logout } = useAdminAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const websiteHrefs = adminNav
    .filter((i) => i.group === "Website")
    .map((i) => i.href);
  const onWebsitePage = websiteHrefs.some((h) => pathname.startsWith(h));
  const [websiteOpen, setWebsiteOpen] = useState(onWebsitePage);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 lg:flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-200 transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="text-xl">🔶</span>
          <div>
            <div className="font-display font-bold text-white text-sm leading-tight">
              Pre Visa Hub
            </div>
            <div className="text-[10px] tracking-widest text-slate-400">ADMIN PANEL</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {adminNavGroups.map((group) => {
            const items = adminNav.filter((i) => i.group === group);
            if (!items.length) return null;

            const link = (item: (typeof adminNav)[number]) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // The root layout reads site content from the database on
                  // every render, so prefetching all the sidebar links would
                  // fire a server render (and a query) each, per page view.
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-orange-500 text-white font-semibold"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            };

            // Website editing is eleven pages that are visited occasionally,
            // so they collapse into one entry instead of burying the daily
            // student work below a long list.
            if (group === "Website") {
              return (
                <div key={group} className="pt-2">
                  <button
                    onClick={() => setWebsiteOpen((o) => !o)}
                    aria-expanded={websiteOpen}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                  >
                    <span className="text-base">🌐</span>
                    <span className="font-semibold">Edit Website</span>
                    <span className="ml-auto text-[10px] text-slate-500">
                      {items.length}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${
                        websiteOpen ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" />
                    </svg>
                  </button>
                  {websiteOpen && (
                    <div className="mt-1 space-y-1 border-l border-white/10 pl-2">
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
                  <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {group}
                  </div>
                )}
                {items.map(link)}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 space-y-1">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            <span>🌐</span> View website
          </a>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-white/10"
          >
            <span>🚪</span> Logout
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-display font-bold">Admin Panel</span>
        </header>
        {/* The CRM has wide tables and a kanban board, so it gets more room
            than the content-editing pages. */}
        <main
          className={`p-4 sm:p-6 mx-auto ${
            /^\/admin\/(crm|sales|import|staff)/.test(pathname) ? "max-w-7xl" : "max-w-4xl"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
