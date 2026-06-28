"use client";

import { useContent } from "@/lib/SiteContentContext";

export default function Hero() {
  const { hero } = useContent();

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-br from-brand-cream via-white to-orange-50"
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-orange/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-brand-navy/20 blur-3xl" />

      <div className="container-x relative py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-semibold text-brand-orange-dark">
            <span className="h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
            {hero.badge}
          </div>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-brand-navy">
            {hero.titleStart}{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-brand-orange">{hero.titleHighlight}</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-brand-orange/20 -z-0" />
            </span>{" "}
            {hero.titleEnd}
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-xl">{hero.subtitle}</p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <a href="#contact" className="btn-primary">
              {hero.primaryBtn}
              <svg className="ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#services" className="btn-secondary">
              {hero.secondaryBtn}
            </a>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {hero.stats.map((s, i) => (
              <Stat key={i} value={s.value} label={s.label} valueSize={s.valueSize} />
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-square max-w-md mx-auto animate-float">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-orange to-brand-navy opacity-20 blur-2xl" />
            <div className="relative h-full rounded-3xl bg-white shadow-2xl shadow-brand-navy/20 border border-slate-100 p-8 flex flex-col items-center justify-center">
              {hero.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.imageUrl}
                  alt={hero.cardTitle}
                  style={{
                    width: hero.imageSize,
                    height: hero.imageSize,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <BigLogo size={hero.imageSize} />
              )}
              <h3 className="mt-6 font-display text-2xl font-extrabold text-brand-navy text-center">
                {hero.cardTitle}
              </h3>
              <p className="mt-1 text-xs font-bold tracking-[0.2em] text-slate-500">
                {hero.cardSubtitle}
              </p>
              <div className="mt-6 flex gap-2 flex-wrap justify-center">
                {hero.tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 text-xs font-semibold rounded-full bg-brand-orange/10 text-brand-orange-dark"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className="hidden md:block absolute -left-4 top-12 bg-white rounded-2xl shadow-xl p-4 border border-slate-100 animate-float" style={{ animationDelay: "1s" }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand-orange/15 flex items-center justify-center text-xl">{hero.floatCard1.icon}</div>
              <div>
                <div className="text-sm font-bold text-brand-navy">{hero.floatCard1.title}</div>
                <div className="text-xs text-slate-500">{hero.floatCard1.sub}</div>
              </div>
            </div>
          </div>
          <div className="hidden md:block absolute -right-4 bottom-12 bg-white rounded-2xl shadow-xl p-4 border border-slate-100 animate-float" style={{ animationDelay: "2s" }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand-navy/15 flex items-center justify-center text-xl">{hero.floatCard2.icon}</div>
              <div>
                <div className="text-sm font-bold text-brand-navy">{hero.floatCard2.title}</div>
                <div className="text-xs text-slate-500">{hero.floatCard2.sub}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label, valueSize }: { value: string; label: string; valueSize: number }) {
  return (
    <div>
      <div
        className="font-display font-extrabold text-brand-orange"
        style={{ fontSize: valueSize }}
      >
        {value}
      </div>
      <div className="text-xs text-slate-600 mt-1">{label}</div>
    </div>
  );
}

function BigLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="96" fill="#fff" stroke="#E97A2E" strokeWidth="8" />
      <circle cx="100" cy="100" r="84" fill="#fff" stroke="#1E3A8A" strokeWidth="3" />
      <path d="M40 130 Q100 110 160 130 L160 158 Q100 138 40 158 Z" fill="#E97A2E" />
      <path d="M100 122 L100 152" stroke="#fff" strokeWidth="2" />
      <circle cx="100" cy="92" r="32" fill="#E97A2E" />
      <path
        d="M68 92 Q100 76 132 92 M68 92 Q100 108 132 92 M100 60 L100 124 M84 65 Q92 92 84 119 M116 65 Q108 92 116 119"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
      />
      <path d="M60 58 L100 44 L140 58 L100 72 Z" fill="#1E3A8A" />
      <path d="M100 72 L100 84" stroke="#1E3A8A" strokeWidth="3" />
      <path d="M126 64 L126 80 Q126 88 100 88 Q74 88 74 80 L74 64" fill="#1E3A8A" />
      <circle cx="138" cy="58" r="3" fill="#E97A2E" />
      <path
        d="M118 100 Q132 92 142 100 L138 96 M142 100 L138 104"
        stroke="#1E3A8A"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
