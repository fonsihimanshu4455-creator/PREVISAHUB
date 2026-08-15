import type { IconName } from "@/components/admin/Icon";

// Single source of truth for the admin sidebar / dashboard cards.
export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  desc: string;
  group: "Main" | "Sales" | "Students" | "Website";
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", desc: "Today at a glance", group: "Main" },

  // The tele-sales half of the business, before a lead becomes a student.
  { href: "/crm", label: "Sales CRM", icon: "phone", desc: "Leads, calling, follow-ups & conversions", group: "Sales" },
  { href: "/crm/calling", label: "Call Queue", icon: "phone", desc: "Overdue, due today & never called", group: "Sales" },
  { href: "/crm/pipeline", label: "Sales Pipeline", icon: "grid", desc: "Drag leads through the funnel", group: "Sales" },
  { href: "/crm/import", label: "Import Leads Sheet", icon: "import", desc: "Old database — columns detected automatically", group: "Sales" },
  { href: "/crm/reports", label: "Sales Reports", icon: "dashboard", desc: "Calling, conversion & employee KPIs", group: "Sales" },

  // Day-to-day work
  { href: "/admin/crm", label: "Students", icon: "students", desc: "Visa status, scores & follow-ups", group: "Students" },
  { href: "/admin/crm?tab=tests", label: "Tests", icon: "tests", desc: "Weekly & sessional PTE/IELTS scores", group: "Students" },
  { href: "/admin/crm?tab=attendance", label: "Attendance", icon: "attendance", desc: "Daily class attendance & rates", group: "Students" },
  { href: "/admin/crm?tab=documents", label: "Documents", icon: "documents", desc: "Passports, offer letters & reports", group: "Students" },
  { href: "/admin/crm?tab=calling", label: "Calling", icon: "phone", desc: "Telecaller lists & call outcomes", group: "Students" },
  { href: "/admin/sales", label: "Sales & Payments", icon: "money", desc: "Fees collected, dues & revenue", group: "Students" },
  { href: "/admin/import", label: "Import Students", icon: "import", desc: "Bulk upload from Excel or CSV", group: "Students" },
  { href: "/admin/staff", label: "Staff Accounts", icon: "team", desc: "Counsellor & telecaller logins", group: "Students" },

  // Website editing
  { href: "/admin/settings", label: "Global Settings", icon: "settings", desc: "Phone, WhatsApp, Instagram, hours", group: "Website" },
  { href: "/admin/theme", label: "Theme & Colours", icon: "palette", desc: "Brand colours across the site", group: "Website" },
  { href: "/admin/logo", label: "Logo", icon: "logo", desc: "Logo image, text & size", group: "Website" },
  { href: "/admin/navbar", label: "Navbar", icon: "menu-list", desc: "Menu links & top bar", group: "Website" },
  { href: "/admin/hero", label: "Hero Section", icon: "star", desc: "Headline, image, stats & cards", group: "Website" },
  { href: "/admin/services", label: "Services", icon: "grid", desc: "Service cards, icons & sizes", group: "Website" },
  { href: "/admin/countries", label: "Countries", icon: "map", desc: "Destinations, flags & images", group: "Website" },
  { href: "/admin/about", label: "About", icon: "info", desc: "Story, features & stat cards", group: "Website" },
  { href: "/admin/contact", label: "Contact", icon: "mail", desc: "Contact info & form options", group: "Website" },
  { href: "/admin/footer", label: "Footer", icon: "file", desc: "Footer text & links", group: "Website" },
  { href: "/admin/floating", label: "WhatsApp Button", icon: "chat", desc: "Floating button & size", group: "Website" },
];

export const adminNavGroups: AdminNavItem["group"][] = [
  "Main", "Sales", "Students", "Website",
];
