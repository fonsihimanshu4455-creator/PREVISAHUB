import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { logoutAction } from "./actions";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/hero", label: "Hero" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/countries", label: "Countries" },
  { href: "/admin/about", label: "About" },
  { href: "/admin/contact", label: "Contact" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-orange/15 flex items-center justify-center text-brand-orange font-bold">
              P
            </div>
            <div>
              <div className="font-display font-bold text-brand-navy text-sm">
                Pre Visa Hub Admin
              </div>
              <div className="text-xs text-slate-500">Content management</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-sm text-slate-600 hover:text-brand-orange"
            >
              View site ↗
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm font-medium text-slate-700 hover:text-brand-orange"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="border-t border-slate-100 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-3 text-sm font-medium text-slate-600 hover:text-brand-orange whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
