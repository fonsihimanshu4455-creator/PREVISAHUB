"use client";

import { useState } from "react";
import Logo from "./Logo";
import { useContent } from "@/lib/SiteContentContext";

export default function Navbar() {
  const { navbar, global } = useContent();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="container-x flex items-center justify-between py-3">
        <a href="#home" className="flex-shrink-0">
          <Logo size={navbar.logoSize} />
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {navbar.links.map((l) => (
            <a
              key={l.href + l.label}
              href={l.href}
              className="text-sm font-medium text-slate-700 hover:text-brand-orange transition"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {navbar.showPhone && (
            <a
              href={`tel:${global.phone}`}
              className="text-sm font-semibold text-brand-navy hover:text-brand-orange"
            >
              {global.phoneDisplay}
            </a>
          )}
          <a href="#contact" className="btn-primary !py-2 !px-5">
            {navbar.ctaLabel}
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 text-brand-navy"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <div className="container-x py-4 flex flex-col gap-3">
            {navbar.links.map((l) => (
              <a
                key={l.href + l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium text-slate-700 hover:text-brand-orange"
              >
                {l.label}
              </a>
            ))}
            {navbar.showPhone && (
              <a href={`tel:${global.phone}`} className="py-2 text-sm font-semibold text-brand-navy">
                Call: {global.phoneDisplay}
              </a>
            )}
            <a href="#contact" onClick={() => setOpen(false)} className="btn-primary">
              {navbar.ctaLabel}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
