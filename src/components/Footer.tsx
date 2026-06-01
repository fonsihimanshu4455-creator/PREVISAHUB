import Logo from "./Logo";
import type { Contact } from "@/lib/content-types";

export default function Footer({ contact }: { contact: Contact }) {
  return (
    <footer className="bg-brand-navy-dark text-blue-100">
      <div className="container-x py-14">
        <div className="grid lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="bg-white inline-block rounded-2xl p-3">
              <Logo size={50} />
            </div>
            <p className="mt-5 text-sm text-blue-100/70 max-w-md leading-relaxed">
              Pre Visa Hub is your trusted study abroad consultants — empowering
              students to achieve global education dreams in USA, Canada,
              Australia, UK and Europe.
            </p>
            <div className="mt-6 flex gap-3">
              <Social href={contact.instagramUrl} label="Instagram" icon="📸" />
              <Social href={`https://wa.me/${contact.whatsappNumber}`} label="WhatsApp" icon="💬" />
              <Social href={`tel:${contact.phoneRaw}`} label="Call" icon="📞" />
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <FooterLink href="#home">Home</FooterLink>
              <FooterLink href="#services">Services</FooterLink>
              <FooterLink href="#countries">Countries</FooterLink>
              <FooterLink href="#about">About Us</FooterLink>
              <FooterLink href="#contact">Contact</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <FooterLink href="#services">Student Visa</FooterLink>
              <FooterLink href="#services">Tourist Visa</FooterLink>
              <FooterLink href="#services">IELTS Coaching</FooterLink>
              <FooterLink href="#services">PTE Coaching</FooterLink>
              <FooterLink href="#services">University Admissions</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-sm">
          <p className="text-blue-100/60">
            © {new Date().getFullYear()} Pre Visa Hub. All rights reserved.
          </p>
          <p className="text-blue-100/60">
            Made with <span className="text-brand-orange">♥</span> for aspiring students
          </p>
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
