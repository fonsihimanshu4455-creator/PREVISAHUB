"use client";

import { useState } from "react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name");
    const phone = data.get("phone");
    const message = data.get("message");
    const country = data.get("country");
    const service = data.get("service");

    const text = `Hi Pre Visa Hub, I'd like to enquire.%0A%0AName: ${name}%0APhone: ${phone}%0APreferred Country: ${country}%0AService: ${service}%0AMessage: ${message}`;
    window.open(`https://wa.me/918950991108?text=${text}`, "_blank");
    setSubmitted(true);
  };

  return (
    <section
      id="contact"
      className="py-20 lg:py-28 bg-gradient-to-br from-brand-cream via-white to-orange-50 relative overflow-hidden"
    >
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-orange/15 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand-navy/15 blur-3xl" />

      <div className="container-x relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1 rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange-dark tracking-widest mb-4">
            GET IN TOUCH
          </div>
          <h2 className="section-title">Start Your Journey Today</h2>
          <p className="section-subtitle mx-auto">
            Free counselling session — talk to our expert and find out the best
            study abroad path for you.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-5 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-4">
            <ContactCard
              icon="📞"
              title="Call Us"
              value="+91 89509 91108"
              href="tel:+918950991108"
            />
            <ContactCard
              icon="💬"
              title="WhatsApp"
              value="Quick chat with our team"
              href="https://wa.me/918950991108"
            />
            <ContactCard
              icon="📸"
              title="Instagram"
              value="@pre.visa.hub_9"
              href="https://www.instagram.com/pre.visa.hub_9/"
            />
            <ContactCard
              icon="🕒"
              title="Working Hours"
              value="Mon – Sat • 10 AM – 7 PM"
            />
          </div>

          {/* Form */}
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-2xl shadow-brand-navy/10 border border-slate-100 p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="text-6xl">✅</div>
                <h3 className="mt-4 font-display text-2xl font-bold text-brand-navy">
                  Redirecting to WhatsApp…
                </h3>
                <p className="mt-2 text-slate-600">
                  Your enquiry has been prepared. Please send the WhatsApp message
                  that just opened to complete your request.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 btn-secondary"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-display text-2xl font-bold text-brand-navy">
                  Book Free Counselling
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input name="name" label="Full Name" placeholder="Your name" required />
                  <Input name="phone" label="Phone" placeholder="+91 …" type="tel" required />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select
                    name="country"
                    label="Preferred Country"
                    options={[
                      "Select country",
                      "USA",
                      "Canada",
                      "Australia",
                      "United Kingdom",
                      "Europe",
                      "Not sure yet",
                    ]}
                  />
                  <Select
                    name="service"
                    label="Service Required"
                    options={[
                      "Select service",
                      "Student Visa",
                      "Tourist Visa",
                      "IELTS Coaching",
                      "PTE Coaching",
                      "University Admission",
                      "Other",
                    ]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Message
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Tell us about your goals…"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition"
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Send Enquiry via WhatsApp
                  <svg className="ml-2" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
                <p className="text-xs text-slate-500 text-center">
                  By submitting, you agree to be contacted by our team.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon,
  title,
  value,
  href,
}: {
  icon: string;
  title: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-brand-orange/40 hover:shadow-lg transition flex items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-brand-orange/10 flex items-center justify-center text-2xl flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-500 tracking-wider uppercase">
          {title}
        </div>
        <div className="font-semibold text-brand-navy truncate">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}

function Input({
  name,
  label,
  ...rest
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition"
      />
    </div>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition"
      >
        {options.map((o, i) => (
          <option key={o} value={i === 0 ? "" : o} disabled={i === 0}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
