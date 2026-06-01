import type { About as AboutType } from "@/lib/content-types";

export default function About({ about }: { about: AboutType }) {
  return (
    <section id="about" className="py-20 lg:py-28 bg-white">
      <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-4 py-1 rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange-dark tracking-widest mb-4">
            ABOUT US
          </div>
          <h2 className="section-title">
            {about.titlePrefix}{" "}
            <span className="text-brand-orange">{about.titleHighlight}</span>
          </h2>
          <p className="section-subtitle">{about.para1}</p>
          <p className="mt-4 text-slate-600">{about.para2}</p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {about.features.map((f) => (
              <div key={f.id} className="flex gap-3">
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
              Get in Touch
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-brand-orange to-brand-orange-dark text-white rounded-2xl p-6 shadow-lg">
                <div className="text-4xl font-display font-extrabold">{about.stat1Value}</div>
                <div className="text-sm mt-1 opacity-90">{about.stat1Label}</div>
              </div>
              <div className="bg-brand-cream rounded-2xl p-6 border border-orange-100">
                <div className="text-4xl">🎓</div>
                <div className="mt-2 font-display font-bold text-brand-navy">Top Universities</div>
                <div className="text-sm text-slate-600 mt-1">Across 5 destinations</div>
              </div>
            </div>
            <div className="space-y-4 mt-8">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="text-4xl">🌟</div>
                <div className="mt-2 font-display font-bold text-brand-navy">Premium Service</div>
                <div className="text-sm text-slate-600 mt-1">Personalised guidance</div>
              </div>
              <div className="bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white rounded-2xl p-6 shadow-lg">
                <div className="text-4xl font-display font-extrabold">{about.stat2Value}</div>
                <div className="text-sm mt-1 opacity-90">{about.stat2Label}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
