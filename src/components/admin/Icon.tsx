/**
 * One stroke-icon set at a single weight, so the console reads as one system.
 * Emoji were doing this job before — they render differently on every platform
 * and pull colour into places that should be quiet.
 */
export type IconName =
  | "dashboard"
  | "students"
  | "tests"
  | "attendance"
  | "documents"
  | "money"
  | "import"
  | "team"
  | "phone"
  | "globe"
  | "settings"
  | "palette"
  | "logo"
  | "menu-list"
  | "star"
  | "grid"
  | "map"
  | "info"
  | "mail"
  | "file"
  | "chat"
  | "logout"
  | "chevron"
  | "search"
  | "plus"
  | "check";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  students: (
    <>
      <path d="M12 4 2.5 9 12 14l9.5-5L12 4Z" />
      <path d="M6 11v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
    </>
  ),
  tests: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 14.5l1.8 1.8L15 12" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8.5 14.5l1.6 1.6L14 12.5" />
    </>
  ),
  documents: (
    <>
      <path d="M20.5 11.5 12 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" />
    </>
  ),
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  import: (
    <>
      <path d="M12 3v11" />
      <path d="M8 10.5 12 14.5l4-4" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M17.5 14.8c2 .8 3.5 2.7 3.5 5.2" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2C10.8 18.4 5.6 13.2 4.5 5.7A2 2 0 0 1 6.5 3.5Z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.6a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.5 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.1Z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="11" cy="7.5" r="1" />
      <circle cx="16" cy="9" r="1" />
    </>
  ),
  logo: (
    <>
      <path d="M12 3 21 12 12 21 3 12 12 3Z" />
    </>
  ),
  "menu-list": (
    <>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </>
  ),
  star: (
    <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6Z" />
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h4" />
    </>
  ),
  chat: (
    <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" />
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m20 6-11 11-5-5" />,
};

export default function Icon({
  name,
  className = "h-[18px] w-[18px]",
  strokeWidth = 1.7,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
