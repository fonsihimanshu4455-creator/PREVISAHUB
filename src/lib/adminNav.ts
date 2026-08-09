// Single source of truth for the admin sidebar / dashboard cards.
export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  desc: string;
  group: "Main" | "Students" | "Website";
};

export const adminNav: AdminNavItem[] = [
  // --- Main -----------------------------------------------------------
  { href: "/admin", label: "Dashboard", icon: "🏠", desc: "Overview & quick actions", group: "Main" },

  // --- Students / business --------------------------------------------
  { href: "/admin/crm", label: "Students", icon: "🎓", desc: "Visa status, IELTS/PTE scores & follow-ups", group: "Students" },
  { href: "/admin/staff", label: "Staff Accounts", icon: "👥", desc: "Counsellor logins & access", group: "Students" },

  // --- Website editing -------------------------------------------------
  { href: "/admin/settings", label: "Global Settings", icon: "⚙️", desc: "Phone, WhatsApp, Instagram, hours", group: "Website" },
  { href: "/admin/theme", label: "Theme & Colours", icon: "🎨", desc: "Brand colours across the site", group: "Website" },
  { href: "/admin/logo", label: "Logo", icon: "🔶", desc: "Logo image, text & size", group: "Website" },
  { href: "/admin/navbar", label: "Navbar", icon: "📋", desc: "Menu links & top bar", group: "Website" },
  { href: "/admin/hero", label: "Hero Section", icon: "⭐", desc: "Headline, image, stats & cards", group: "Website" },
  { href: "/admin/services", label: "Services", icon: "🧩", desc: "Service cards, icons & sizes", group: "Website" },
  { href: "/admin/countries", label: "Countries", icon: "🌍", desc: "Destinations, flags & images", group: "Website" },
  { href: "/admin/about", label: "About", icon: "ℹ️", desc: "Story, features & stat cards", group: "Website" },
  { href: "/admin/contact", label: "Contact", icon: "✉️", desc: "Contact info & form options", group: "Website" },
  { href: "/admin/footer", label: "Footer", icon: "📄", desc: "Footer text & links", group: "Website" },
  { href: "/admin/floating", label: "WhatsApp Button", icon: "💬", desc: "Floating button & size", group: "Website" },
];

export const adminNavGroups: AdminNavItem["group"][] = ["Main", "Students", "Website"];
