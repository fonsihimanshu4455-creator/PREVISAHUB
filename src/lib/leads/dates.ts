// ---------------------------------------------------------------------------
// Dates, spelled out by hand.
//
// Never toLocaleDateString: Node and Chrome ship different ICU data and
// disagree about the comma after a weekday, so a date rendered on the server
// and re-rendered in the browser does not match and React throws the page away.
// ---------------------------------------------------------------------------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole days between two plain dates. */
export function daysBetween(iso: string, from: string): number | null {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(iso + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** "Sat 15 Aug" — no year, because a calling list never spans one. */
export function shortDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/**
 * What a person calls the day: "Today", "Tomorrow", "Yesterday", else the
 * weekday and date. A bare 2026-08-15 makes the reader do the arithmetic.
 */
export function dayLabel(iso: string, from = todayIso()): string {
  if (!iso) return "No date";
  const gap = daysBetween(iso, from);
  if (gap === null) return iso;
  if (gap === 0) return "Today";
  if (gap === 1) return "Tomorrow";
  if (gap === -1) return "Yesterday";
  return shortDay(iso);
}

/** "Today · Sat 15 Aug" — the familiar word, with the actual date beside it. */
export function dayLabelFull(iso: string, from = todayIso()): {
  label: string;
  detail: string;
} {
  const label = dayLabel(iso, from);
  const detail = shortDay(iso);
  return { label, detail: label === detail ? "" : detail };
}

/** "in 3 days" / "2 days ago" — for a date the reader is deciding about. */
export function relativeDay(iso: string, from = todayIso()): string {
  if (!iso) return "no date";
  const gap = daysBetween(iso, from);
  if (gap === null) return iso;
  if (gap === 0) return "today";
  if (gap === 1) return "tomorrow";
  if (gap === -1) return "yesterday";
  return gap < 0 ? `${-gap} days ago` : `in ${gap} days`;
}

export function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`;
}
