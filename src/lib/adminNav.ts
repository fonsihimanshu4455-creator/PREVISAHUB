// Single source of truth for the admin sidebar / dashboard cards.
export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  desc: string;
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "🏠", desc: "Overview & quick actions" },
  { href: "/admin/settings", label: "Global Settings", icon: "⚙️", desc: "Phone, WhatsApp, Instagram, hours" },
  { href: "/admin/theme", label: "Theme & Colours", icon: "🎨", desc: "Brand colours across the site" },
  { href: "/admin/logo", label: "Logo", icon: "🔶", desc: "Logo image, text & size" },
  { href: "/admin/navbar", label: "Navbar", icon: "📋", desc: "Menu links & top bar" },
  { href: "/admin/hero", label: "Hero Section", icon: "⭐", desc: "Headline, image, stats & cards" },
  { href: "/admin/services", label: "Services", icon: "🧩", desc: "Service cards, icons & sizes" },
  { href: "/admin/countries", label: "Countries", icon: "🌍", desc: "Destinations, flags & images" },
  { href: "/admin/about", label: "About", icon: "ℹ️", desc: "Story, features & stat cards" },
  { href: "/admin/contact", label: "Contact", icon: "✉️", desc: "Contact info & form options" },
  { href: "/admin/footer", label: "Footer", icon: "📄", desc: "Footer text & links" },
  { href: "/admin/floating", label: "WhatsApp Button", icon: "💬", desc: "Floating button & size" },
];
