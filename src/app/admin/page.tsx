import Link from "next/link";

const sections = [
  {
    href: "/admin/hero",
    title: "Hero Section",
    desc: "Banner heading, tagline, CTAs and the 3 statistics shown on top of the home page.",
    icon: "🚀",
  },
  {
    href: "/admin/services",
    title: "Services",
    desc: "Add, edit or remove the services shown in the Services grid.",
    icon: "💼",
  },
  {
    href: "/admin/countries",
    title: "Countries",
    desc: "Manage study destinations — flags, descriptions and university counts.",
    icon: "🌍",
  },
  {
    href: "/admin/about",
    title: "About",
    desc: "About paragraphs, 4 feature points and the highlight stats.",
    icon: "ℹ️",
  },
  {
    href: "/admin/contact",
    title: "Contact",
    desc: "Phone number, WhatsApp, Instagram handle and working hours.",
    icon: "📞",
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-brand-navy">
          Dashboard
        </h1>
        <p className="mt-2 text-slate-600">
          Pick a section to edit. Changes go live on the website immediately
          after you save.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-brand-orange/40 hover:shadow-lg transition"
          >
            <div className="text-3xl">{s.icon}</div>
            <h2 className="mt-3 font-display text-lg font-bold text-brand-navy">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
            <div className="mt-4 text-sm font-semibold text-brand-orange group-hover:gap-2 inline-flex items-center gap-1 transition-all">
              Edit →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
