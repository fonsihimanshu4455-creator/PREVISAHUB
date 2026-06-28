"use client";

import { useContent } from "@/lib/SiteContentContext";

export default function About() {
  const { about } = useContent();

  return (
    <section id="about" className="py-20 lg:py-28 bg-white">
      <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-4 py-1 rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange-dark tracking-widest mb-4">
            {about.badge}
          </div>
          <h2 className="section-title">
            {about.titleStart}{" "}
            <span className="text-brand-orange">{about.titleHighlight}</span>
          </h2>
          <p className="section-subtitle">{about.paragraph1}</p>
          <p className="mt-4 text-slate-600">{about.paragraph2}</p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {about.features.map((f, i) => (
              <div key={f.title + i} className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold text-brand-navy">{f.title}</h4>
                  <p className="text-sm text-slate-600 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <a href="#contact" className="btn-primary">
              {about.ctaLabel}
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <AboutCardView card={about.cards[0]} variant="orange" />
              <AboutCardView card={about.cards[1]} variant="cream" />
            </div>
            <div className="space-y-4 mt-8">
              <AboutCardView card={about.cards[2]} variant="slate" />
              <AboutCardView card={about.cards[3]} variant="navy" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutCardView({
  card,
  variant,
}: {
  card: { kind: "stat" | "icon"; value: string; label: string; sub: string; icon: string };
  variant: "orange" | "cream" | "slate" | "navy";
}) {
  if (!card) return null;
  const styles: Record<string, string> = {
    orange: "bg-gradient-to-br from-brand-orange to-brand-orange-dark text-white shadow-lg",
    cream: "bg-brand-cream border border-orange-100",
    slate: "bg-slate-50 border border-slate-100",
    navy: "bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white shadow-lg",
  };
  const subColor = variant === "orange" || variant === "navy" ? "opacity-90" : "text-slate-600";

  return (
    <div className={`rounded-2xl p-6 ${styles[variant]}`}>
      {card.kind === "stat" ? (
        <>
          <div className="text-4xl font-display font-extrabold">{card.value}</div>
          <div className={`text-sm mt-1 ${subColor}`}>{card.label}</div>
        </>
      ) : (
        <>
          <div className="text-4xl">{card.icon}</div>
          <div
            className={`mt-2 font-display font-bold ${
              variant === "orange" || variant === "navy" ? "" : "text-brand-navy"
            }`}
          >
            {card.label}
          </div>
          {card.sub && <div className={`text-sm mt-1 ${subColor}`}>{card.sub}</div>}
        </>
      )}
    </div>
  );
}
