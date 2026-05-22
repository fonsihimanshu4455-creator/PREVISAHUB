const features = [
  { icon: "✓", title: "Expert Counsellors", desc: "Certified advisors with deep knowledge of global education systems." },
  { icon: "✓", title: "High Visa Success Rate", desc: "Consistently high approval rates across all major destinations." },
  { icon: "✓", title: "End-to-End Support", desc: "From IELTS coaching to landing — we handle every step." },
  { icon: "✓", title: "Transparent Process", desc: "No hidden charges. Clear timelines and honest guidance." },
];

export default function About() {
  return (
    <section id="about" className="py-20 lg:py-28 bg-white">
      <div className="container-x grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-4 py-1 rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange-dark tracking-widest mb-4">
            ABOUT US
          </div>
          <h2 className="section-title">
            Your Trusted Partner for{" "}
            <span className="text-brand-orange">Global Education</span>
          </h2>
          <p className="section-subtitle">
            At Pre Visa Hub, we believe every aspiring student deserves the chance
            to study abroad. Our mission is to simplify the complex journey of
            international education — from coaching to admission to visa.
          </p>
          <p className="mt-4 text-slate-600">
            With dedicated counsellors, proven IELTS &amp; PTE methodology, and an
            unbeatable visa success record, we&apos;ve helped thousands of students
            achieve their dreams across the USA, Canada, Australia, UK and
            Europe.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold">
                  {f.icon}
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
                <div className="text-4xl font-display font-extrabold">5000+</div>
                <div className="text-sm mt-1 opacity-90">Students Placed Abroad</div>
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
                <div className="text-4xl font-display font-extrabold">98%</div>
                <div className="text-sm mt-1 opacity-90">Visa Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
