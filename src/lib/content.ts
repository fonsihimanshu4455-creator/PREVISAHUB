// ============================================================================
// Pre Visa Hub — Central Editable Content Model
// ----------------------------------------------------------------------------
// Every piece of text, image and size shown on the website lives here.
// The admin panel edits this object; the public site reads from it.
// All `*Size` fields are pixel values so they can be typed directly in admin.
// ============================================================================

export type NavLink = { label: string; href: string };

export type Stat = { value: string; label: string; valueSize: number };

export type ServiceItem = {
  icon: string;
  imageUrl: string | null;
  title: string;
  desc: string;
  color: string;
  iconSize: number;
};

export type CountryItem = {
  name: string;
  flag: string;
  imageUrl: string | null;
  desc: string;
  universities: string;
  flagSize: number;
};

export type FeatureItem = { title: string; desc: string };

export type AboutCard = {
  kind: "stat" | "icon";
  value: string;
  label: string;
  sub: string;
  icon: string;
};

export type ContactInfo = {
  icon: string;
  title: string;
  value: string;
  href: string;
};

export type FloatCard = { icon: string; title: string; sub: string };

export type SiteContent = {
  // ---- Global / business-wide settings -----------------------------------
  global: {
    brandName: string;
    tagline: string;
    phone: string; // raw, for tel:
    phoneDisplay: string; // pretty
    whatsapp: string; // digits only
    instagramHandle: string;
    instagramUrl: string;
    email: string;
    workingHours: string;
  };

  // ---- Theme colours ------------------------------------------------------
  theme: {
    orange: string;
    orangeDark: string;
    orangeLight: string;
    navy: string;
    navyDark: string;
    navyLight: string;
    cream: string;
  };

  // ---- Logo ---------------------------------------------------------------
  logo: {
    imageUrl: string | null; // if set, replaces the built-in SVG logo
    size: number; // px
    showText: boolean;
    textLine1: string;
    textLine2: string;
  };

  // ---- Navbar -------------------------------------------------------------
  navbar: {
    logoSize: number;
    links: NavLink[];
    ctaLabel: string;
    showPhone: boolean;
  };

  // ---- Hero ---------------------------------------------------------------
  hero: {
    badge: string;
    titleStart: string;
    titleHighlight: string;
    titleEnd: string;
    subtitle: string;
    primaryBtn: string;
    secondaryBtn: string;
    imageUrl: string | null; // optional hero image inside the card
    imageSize: number; // px (logo/image inside card)
    cardTitle: string;
    cardSubtitle: string;
    tags: string[];
    stats: Stat[];
    floatCard1: FloatCard;
    floatCard2: FloatCard;
  };

  // ---- Services -----------------------------------------------------------
  services: {
    badge: string;
    title: string;
    subtitle: string;
    items: ServiceItem[];
  };

  // ---- Countries ----------------------------------------------------------
  countries: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    items: CountryItem[];
  };

  // ---- About --------------------------------------------------------------
  about: {
    badge: string;
    titleStart: string;
    titleHighlight: string;
    paragraph1: string;
    paragraph2: string;
    ctaLabel: string;
    features: FeatureItem[];
    cards: AboutCard[];
  };

  // ---- Contact ------------------------------------------------------------
  contact: {
    badge: string;
    title: string;
    subtitle: string;
    formTitle: string;
    countries: string[];
    services: string[];
    info: ContactInfo[];
  };

  // ---- Footer -------------------------------------------------------------
  footer: {
    logoSize: number;
    description: string;
    quickLinksTitle: string;
    quickLinks: NavLink[];
    servicesTitle: string;
    serviceLinks: NavLink[];
    copyright: string;
    madeWith: string;
  };

  // ---- Floating WhatsApp button ------------------------------------------
  floatingCTA: {
    enabled: boolean;
    message: string;
    size: number; // px
  };
};

// ============================================================================
// DEFAULT CONTENT — mirrors the original hardcoded website
// ============================================================================

export const defaultContent: SiteContent = {
  global: {
    brandName: "Pre Visa Hub",
    tagline: "Study Abroad Consultant",
    phone: "+918950991108",
    phoneDisplay: "+91 89509 91108",
    whatsapp: "918950991108",
    instagramHandle: "@pre.visa.hub_9",
    instagramUrl: "https://www.instagram.com/pre.visa.hub_9/",
    email: "",
    workingHours: "Mon – Sat • 10 AM – 7 PM",
  },

  theme: {
    orange: "#E97A2E",
    orangeDark: "#C95F1A",
    orangeLight: "#FFB37A",
    navy: "#1E3A8A",
    navyDark: "#102558",
    navyLight: "#3B5BBF",
    cream: "#FFF8F1",
  },

  logo: {
    imageUrl: null,
    size: 48,
    showText: true,
    textLine1: "PRE·VISA HUB",
    textLine2: "STUDY ABROAD CONSULTANT",
  },

  navbar: {
    logoSize: 48,
    links: [
      { href: "#home", label: "Home" },
      { href: "#services", label: "Services" },
      { href: "#countries", label: "Countries" },
      { href: "#about", label: "About" },
      { href: "#contact", label: "Contact" },
    ],
    ctaLabel: "Free Consultation",
    showPhone: true,
  },

  hero: {
    badge: "Now Enrolling — Free Counselling",
    titleStart: "Your Gateway to",
    titleHighlight: "Study Abroad",
    titleEnd: "Success",
    subtitle:
      "Expert IELTS & PTE coaching with end-to-end visa assistance for USA, Canada, Australia, UK and Europe. We turn your global education dreams into reality.",
    primaryBtn: "Book Free Counselling",
    secondaryBtn: "Explore Services",
    imageUrl: null,
    imageSize: 140,
    cardTitle: "PRE·VISA HUB",
    cardSubtitle: "STUDY ABROAD CONSULTANT",
    tags: ["IELTS", "PTE", "Visa", "Admission"],
    stats: [
      { value: "5000+", label: "Students Placed", valueSize: 30 },
      { value: "98%", label: "Visa Success", valueSize: 30 },
      { value: "25+", label: "Universities", valueSize: 30 },
    ],
    floatCard1: { icon: "🎓", title: "Admission Help", sub: "Top Universities" },
    floatCard2: { icon: "✈️", title: "Visa Assistance", sub: "Quick & Reliable" },
  },

  services: {
    badge: "OUR SERVICES",
    title: "Everything You Need to Study Abroad",
    subtitle:
      "From your first IELTS class to landing at your dream university — we're with you at every step of the journey.",
    items: [
      {
        icon: "🎓",
        imageUrl: null,
        title: "Student Visa",
        desc: "Complete student visa guidance for top universities across USA, Canada, Australia, UK & Europe.",
        color: "from-brand-orange to-orange-400",
        iconSize: 28,
      },
      {
        icon: "📘",
        imageUrl: null,
        title: "IELTS Coaching",
        desc: "Expert IELTS preparation with experienced trainers. Score Band 7+ with our proven methodology.",
        color: "from-brand-navy to-brand-navy-light",
        iconSize: 28,
      },
      {
        icon: "🎯",
        imageUrl: null,
        title: "PTE Coaching",
        desc: "Result-oriented PTE Academic training with mock tests, personalised feedback & AI scoring.",
        color: "from-brand-orange to-brand-orange-dark",
        iconSize: 28,
      },
      {
        icon: "🌍",
        imageUrl: null,
        title: "Tourist Visa",
        desc: "Hassle-free tourist visa processing for Schengen, USA, UK, Canada, Australia & more.",
        color: "from-brand-navy-light to-brand-navy",
        iconSize: 28,
      },
      {
        icon: "🏛️",
        imageUrl: null,
        title: "University Admissions",
        desc: "End-to-end admission assistance — university shortlisting, applications & SOP guidance.",
        color: "from-brand-orange-dark to-brand-orange",
        iconSize: 28,
      },
      {
        icon: "📝",
        imageUrl: null,
        title: "Documentation Help",
        desc: "Professional help with SOPs, LORs, financial docs and complete visa file preparation.",
        color: "from-brand-navy to-brand-navy-dark",
        iconSize: 28,
      },
    ],
  },

  countries: {
    badge: "DESTINATIONS",
    title: "Study in",
    titleHighlight: "Top Destinations",
    subtitle:
      "We help students secure admissions and visas to the world's most sought-after education hubs.",
    items: [
      {
        name: "USA",
        flag: "🇺🇸",
        imageUrl: null,
        desc: "World-class universities & global career opportunities.",
        universities: "4000+",
        flagSize: 48,
      },
      {
        name: "Canada",
        flag: "🇨🇦",
        imageUrl: null,
        desc: "Affordable education with PR pathways post-study.",
        universities: "100+",
        flagSize: 48,
      },
      {
        name: "Australia",
        flag: "🇦🇺",
        imageUrl: null,
        desc: "High-quality education & post-study work visa benefits.",
        universities: "43+",
        flagSize: 48,
      },
      {
        name: "United Kingdom",
        flag: "🇬🇧",
        imageUrl: null,
        desc: "Centuries-old prestige with 2-year graduate work visa.",
        universities: "160+",
        flagSize: 48,
      },
      {
        name: "Europe",
        flag: "🇪🇺",
        imageUrl: null,
        desc: "Germany, France, Ireland & more — many tuition-free options.",
        universities: "500+",
        flagSize: 48,
      },
    ],
  },

  about: {
    badge: "ABOUT US",
    titleStart: "Your Trusted Partner for",
    titleHighlight: "Global Education",
    paragraph1:
      "At Pre Visa Hub, we believe every aspiring student deserves the chance to study abroad. Our mission is to simplify the complex journey of international education — from coaching to admission to visa.",
    paragraph2:
      "With dedicated counsellors, proven IELTS & PTE methodology, and an unbeatable visa success record, we've helped thousands of students achieve their dreams across the USA, Canada, Australia, UK and Europe.",
    ctaLabel: "Get in Touch",
    features: [
      { title: "Expert Counsellors", desc: "Certified advisors with deep knowledge of global education systems." },
      { title: "High Visa Success Rate", desc: "Consistently high approval rates across all major destinations." },
      { title: "End-to-End Support", desc: "From IELTS coaching to landing — we handle every step." },
      { title: "Transparent Process", desc: "No hidden charges. Clear timelines and honest guidance." },
    ],
    cards: [
      { kind: "stat", value: "5000+", label: "Students Placed Abroad", sub: "", icon: "" },
      { kind: "icon", value: "", label: "Top Universities", sub: "Across 5 destinations", icon: "🎓" },
      { kind: "icon", value: "", label: "Premium Service", sub: "Personalised guidance", icon: "🌟" },
      { kind: "stat", value: "98%", label: "Visa Success Rate", sub: "", icon: "" },
    ],
  },

  contact: {
    badge: "GET IN TOUCH",
    title: "Start Your Journey Today",
    subtitle:
      "Free counselling session — talk to our expert and find out the best study abroad path for you.",
    formTitle: "Book Free Counselling",
    countries: [
      "Select country",
      "USA",
      "Canada",
      "Australia",
      "United Kingdom",
      "Europe",
      "Not sure yet",
    ],
    services: [
      "Select service",
      "Student Visa",
      "Tourist Visa",
      "IELTS Coaching",
      "PTE Coaching",
      "University Admission",
      "Other",
    ],
    info: [
      { icon: "📞", title: "Call Us", value: "+91 89509 91108", href: "tel:+918950991108" },
      { icon: "💬", title: "WhatsApp", value: "Quick chat with our team", href: "https://wa.me/918950991108" },
      { icon: "📸", title: "Instagram", value: "@pre.visa.hub_9", href: "https://www.instagram.com/pre.visa.hub_9/" },
      { icon: "🕒", title: "Working Hours", value: "Mon – Sat • 10 AM – 7 PM", href: "" },
    ],
  },

  footer: {
    logoSize: 50,
    description:
      "Pre Visa Hub is your trusted study abroad consultant — empowering students to achieve global education dreams in USA, Canada, Australia, UK and Europe.",
    quickLinksTitle: "Quick Links",
    quickLinks: [
      { href: "#home", label: "Home" },
      { href: "#services", label: "Services" },
      { href: "#countries", label: "Countries" },
      { href: "#about", label: "About Us" },
      { href: "#contact", label: "Contact" },
    ],
    servicesTitle: "Services",
    serviceLinks: [
      { href: "#services", label: "Student Visa" },
      { href: "#services", label: "Tourist Visa" },
      { href: "#services", label: "IELTS Coaching" },
      { href: "#services", label: "PTE Coaching" },
      { href: "#services", label: "University Admissions" },
    ],
    copyright: "Pre Visa Hub. All rights reserved.",
    madeWith: "Made with ♥ for aspiring students",
  },

  floatingCTA: {
    enabled: true,
    message: "Hi Pre Visa Hub, I'd like to enquire about study abroad services.",
    size: 56,
  },
};

// Bump this when the schema changes in a breaking way.
export const CONTENT_VERSION = 1;
export const STORAGE_KEY = "previsahub_content_v1";
export const AUTH_KEY = "previsahub_admin_auth";
// Default admin password — used only until ADMIN_PASSWORD env var or a
// database-stored password is set.
export const DEFAULT_PASSWORD = "previsahub123";
export const PASSWORD_KEY = "previsahub_admin_password";

// Backend (database + auth) keys.
export const KV_CONTENT_KEY = "previsahub:content";
export const KV_PASSWORD_KEY = "previsahub:password";
export const SESSION_COOKIE = "pvh_session";

// Deep-merge stored content over defaults so newly added fields always exist.
// Lives here (no React) so both server and client can use it.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function mergeDefaults<T>(base: T, stored: unknown): T {
  if (!isPlainObject(base)) {
    return stored === undefined ? base : (stored as T);
  }
  if (!isPlainObject(stored)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base as Record<string, unknown>)) {
    out[key] = mergeDefaults(
      (base as Record<string, unknown>)[key],
      stored[key]
    );
  }
  return out as T;
}
