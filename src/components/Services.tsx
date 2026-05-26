const services = [
  {
    icon: "🎓",
    title: "Student Visa",
    desc: "Complete student visa guidance for top universities across USA, Canada, Australia, UK & Europe.",
    color: "from-brand-orange to-orange-400",
  },
  {
    icon: "📘",
    title: "IELTS Coaching",
    desc: "Expert IELTS preparation with experienced trainers. Score Band 7+ with our proven methodology.",
    color: "from-brand-navy to-brand-navy-light",
  },
  {
    icon: "🎯",
    title: "PTE Coaching",
    desc: "Result-oriented PTE Academic training with mock tests, personalised feedback & AI scoring.",
    color: "from-brand-orange to-brand-orange-dark",
  },
  {
    icon: "🌍",
    title: "Tourist Visa",
    desc: "Hassle-free tourist visa processing for Schengen, USA, UK, Canada, Australia & more.",
    color: "from-brand-navy-light to-brand-navy",
  },
  {
    icon: "🏛️",
    title: "University Admissions",
    desc: "End-to-end admission assistance — university shortlisting, applications & SOP guidance.",
    color: "from-brand-orange-dark to-brand-orange",
  },
  {
    icon: "📝",
    title: "Documentation Help",
    desc: "Professional help with SOPs, LORs, financial docs and complete visa file preparation.",
    color: "from-brand-navy to-brand-navy-dark",
  },
];

export default function Services() {
  return (
    <section id="services" className="py-20 lg:py-28 bg-white">
      <div className="container-x">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1 rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange-dark tracking-widest mb-4">
            OUR SERVICES
          </div>
          <h2 className="section-title">Everything You Need to Study Abroad</h2>
          <p className="section-subtitle mx-auto">
            From your first IELTS class to landing at your dream university —
            we&apos;re with you at every step of the journey.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div
              key={s.title}
              className="group relative bg-white rounded-2xl p-6 border border-slate-100 hover:border-brand-orange/30 hover:shadow-2xl hover:shadow-brand-orange/10 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br ${s.color} text-2xl shadow-lg`}
              >
                {s.icon}
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-brand-navy">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-brand-orange group-hover:gap-2 gap-1 transition-all">
                Learn more
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
