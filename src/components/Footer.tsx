"use client";

import Logo from "./Logo";
import { useContent } from "@/lib/SiteContentContext";

export default function Footer() {
  const { footer, global } = useContent();

  return (
    <footer className="bg-brand-navy-dark text-blue-100">
      <div className="container-x py-14">
        <div className="grid lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="bg-white inline-block rounded-2xl p-3">
              <Logo size={footer.logoSize} />
            </div>
            <p className="mt-5 text-sm text-blue-100/70 max-w-md leading-relaxed">
              {footer.description}
            </p>
            <div className="mt-6 flex gap-3">
              <Social href={global.instagramUrl} label="Instagram" icon="📸" />
              <Social href={`https://wa.me/${global.whatsapp}`} label="WhatsApp" icon="💬" />
              <Social href={`tel:${global.phone}`} label="Call" icon="📞" />
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">{footer.quickLinksTitle}</h4>
            <ul className="space-y-2 text-sm">
              {footer.quickLinks.map((l, i) => (
                <FooterLink key={i} href={l.href}>{l.label}</FooterLink>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">{footer.servicesTitle}</h4>
            <ul className="space-y-2 text-sm">
              {footer.serviceLinks.map((l, i) => (
                <FooterLink key={i} href={l.href}>{l.label}</FooterLink>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-sm">
          <p className="text-blue-100/60">
            © {new Date().getFullYear()} {footer.copyright}
          </p>
          <p className="text-blue-100/60">{footer.madeWith}</p>
        </div>
      </div>
    </footer>
  );
}

function Social({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="h-10 w-10 rounded-full bg-white/10 hover:bg-brand-orange hover:text-white flex items-center justify-center transition"
    >
      <span>{icon}</span>
    </a>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="text-blue-100/70 hover:text-brand-orange transition">
        {children}
      </a>
    </li>
  );
}
