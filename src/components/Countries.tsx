import type { Country } from "@/lib/content-types";

export default function Countries({ countries }: { countries: Country[] }) {
  return (
    <section
      id="countries"
      className="py-20 lg:py-28 bg-gradient-to-br from-brand-navy via-brand-navy-dark to-brand-navy text-white relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-9xl">✈️</div>
        <div className="absolute bottom-10 right-10 text-9xl">🌍</div>
      </div>

      <div className="container-x relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1 rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange-light tracking-widest mb-4">
            DESTINATIONS
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Study in <span className="text-brand-orange">Top Destinations</span>{" "}
            Worldwide
          </h2>
          <p className="mt-3 text-base sm:text-lg text-blue-100/80 max-w-2xl mx-auto">
            We help students secure admissions and visas to the world&apos;s most
            sought-after education hubs.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {countries.map((c) => (
            <div
              key={c.id}
              className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-brand-orange/50 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-5xl">{c.flag}</div>
              <h3 className="mt-4 font-display text-2xl font-bold">{c.name}</h3>
              <p className="mt-2 text-sm text-blue-100/70 leading-relaxed">{c.desc}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-100/60">Universities</div>
                  <div className="text-lg font-bold text-brand-orange">{c.universities}</div>
                </div>
                <a
                  href="#contact"
                  className="text-sm font-semibold text-white group-hover:text-brand-orange transition"
                >
                  Apply →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
