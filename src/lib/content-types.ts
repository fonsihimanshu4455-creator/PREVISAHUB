export type Hero = {
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  titleSuffix: string;
  description: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
};

export type Service = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
};

export type Country = {
  id: string;
  flag: string;
  name: string;
  desc: string;
  universities: string;
};

export type Feature = {
  id: string;
  title: string;
  desc: string;
};

export type About = {
  titlePrefix: string;
  titleHighlight: string;
  para1: string;
  para2: string;
  features: Feature[];
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
};

export type Contact = {
  phoneDisplay: string;
  phoneRaw: string;
  whatsappNumber: string;
  instagramHandle: string;
  instagramUrl: string;
  workingHours: string;
};

export type SiteContent = {
  hero: Hero;
  services: Service[];
  countries: Country[];
  about: About;
  contact: Contact;
};

export const SERVICE_COLORS = [
  { label: "Orange (light)", value: "from-brand-orange to-orange-400" },
  { label: "Orange (dark)", value: "from-brand-orange to-brand-orange-dark" },
  { label: "Orange reverse", value: "from-brand-orange-dark to-brand-orange" },
  { label: "Navy (light)", value: "from-brand-navy to-brand-navy-light" },
  { label: "Navy (dark)", value: "from-brand-navy to-brand-navy-dark" },
  { label: "Navy reverse", value: "from-brand-navy-light to-brand-navy" },
];

export const defaultContent: SiteContent = {
  hero: {
    badge: "Now Enrolling — Free Counselling",
    titlePrefix: "Your Gateway to",
    titleHighlight: "Study Abroad",
    titleSuffix: "Success",
    description:
      "Expert IELTS & PTE coaching with end-to-end visa assistance for USA, Canada, Australia, UK and Europe. We turn your global education dreams into reality.",
    primaryCtaText: "Book Free Counselling",
    secondaryCtaText: "Explore Services",
    stat1Value: "5000+",
    stat1Label: "Students Placed",
    stat2Value: "98%",
    stat2Label: "Visa Success",
    stat3Value: "25+",
    stat3Label: "Universities",
  },
  services: [
    {
      id: "svc-student-visa",
      icon: "🎓",
      title: "Student Visa",
      desc: "Complete student visa guidance for top universities across USA, Canada, Australia, UK & Europe.",
      color: "from-brand-orange to-orange-400",
    },
    {
      id: "svc-ielts",
      icon: "📘",
      title: "IELTS Coaching",
      desc: "Expert IELTS preparation with experienced trainers. Score Band 7+ with our proven methodology.",
      color: "from-brand-navy to-brand-navy-light",
    },
    {
      id: "svc-pte",
      icon: "🎯",
      title: "PTE Coaching",
      desc: "Result-oriented PTE Academic training with mock tests, personalised feedback & AI scoring.",
      color: "from-brand-orange to-brand-orange-dark",
    },
    {
      id: "svc-tourist-visa",
      icon: "🌍",
      title: "Tourist Visa",
      desc: "Hassle-free tourist visa processing for Schengen, USA, UK, Canada, Australia & more.",
      color: "from-brand-navy-light to-brand-navy",
    },
    {
      id: "svc-admissions",
      icon: "🏛️",
      title: "University Admissions",
      desc: "End-to-end admission assistance — university shortlisting, applications & SOP guidance.",
      color: "from-brand-orange-dark to-brand-orange",
    },
    {
      id: "svc-docs",
      icon: "📝",
      title: "Documentation Help",
      desc: "Professional help with SOPs, LORs, financial docs and complete visa file preparation.",
      color: "from-brand-navy to-brand-navy-dark",
    },
  ],
  countries: [
    {
      id: "country-usa",
      flag: "🇺🇸",
      name: "USA",
      desc: "World-class universities & global career opportunities.",
      universities: "4000+",
    },
    {
      id: "country-canada",
      flag: "🇨🇦",
      name: "Canada",
      desc: "Affordable education with PR pathways post-study.",
      universities: "100+",
    },
    {
      id: "country-australia",
      flag: "🇦🇺",
      name: "Australia",
      desc: "High-quality education & post-study work visa benefits.",
      universities: "43+",
    },
    {
      id: "country-uk",
      flag: "🇬🇧",
      name: "United Kingdom",
      desc: "Centuries-old prestige with 2-year graduate work visa.",
      universities: "160+",
    },
    {
      id: "country-europe",
      flag: "🇪🇺",
      name: "Europe",
      desc: "Germany, France, Ireland & more — many tuition-free options.",
      universities: "500+",
    },
  ],
  about: {
    titlePrefix: "Your Trusted Partner for",
    titleHighlight: "Global Education",
    para1:
      "At Pre Visa Hub, we believe every aspiring student deserves the chance to study abroad. Our mission is to simplify the complex journey of international education — from coaching to admission to visa.",
    para2:
      "With dedicated counsellors, proven IELTS & PTE methodology, and an unbeatable visa success record, we've helped thousands of students achieve their dreams across the USA, Canada, Australia, UK and Europe.",
    features: [
      {
        id: "feat-1",
        title: "Expert Counsellors",
        desc: "Certified advisors with deep knowledge of global education systems.",
      },
      {
        id: "feat-2",
        title: "High Visa Success Rate",
        desc: "Consistently high approval rates across all major destinations.",
      },
      {
        id: "feat-3",
        title: "End-to-End Support",
        desc: "From IELTS coaching to landing — we handle every step.",
      },
      {
        id: "feat-4",
        title: "Transparent Process",
        desc: "No hidden charges. Clear timelines and honest guidance.",
      },
    ],
    stat1Value: "5000+",
    stat1Label: "Students Placed Abroad",
    stat2Value: "98%",
    stat2Label: "Visa Success Rate",
  },
  contact: {
    phoneDisplay: "+91 89509 91108",
    phoneRaw: "+918950991108",
    whatsappNumber: "918950991108",
    instagramHandle: "@pre.visa.hub_9",
    instagramUrl: "https://www.instagram.com/pre.visa.hub_9/",
    workingHours: "Mon – Sat • 10 AM – 7 PM",
  },
};
