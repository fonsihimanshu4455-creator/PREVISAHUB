"use client";

// ---------------------------------------------------------------------------
// The shared vocabulary of the sales CRM's screens.
//
// Colour follows the same rule the student pipeline already uses: the sales
// journey is a PROGRESSION, so it is one hue deepening as the lead advances,
// not ten unrelated colours. Won, lost and dead are the reserved status
// colours. Seven categorical hues would collapse into each other for a
// colour-blind reader; a ramp keeps the order readable even in greyscale.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { OPEN_STATUSES, LeadStatus, Priority } from "@/lib/leads/types";

/** The progression ramp, light → deep, one step per open status. */
const RAMP = [
  "#c3cbd8", "#a9b8ce", "#8fa8cd", "#7b98c6", "#6b8dc0",
  "#5a80b8", "#4a72b0", "#3a64a6", "#2d569b",
];

export function statusFill(status: LeadStatus): string {
  if (status === "Converted/Won") return "#0f7a52";
  if (status === "Lost" || status === "Not Eligible") return "#b02a1f";
  if (status === "Not Interested") return "#c2705f";
  if (status === "Cold Lead") return "#94a3b8";
  if (status === "Reactivation") return "#a35a06";
  const i = (OPEN_STATUSES as readonly string[]).indexOf(status);
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, i))];
}

/** Chip classes for a status — background, text and ring, all WCAG AA on white. */
export function statusChip(status: LeadStatus): string {
  switch (status) {
    case "Converted/Won":
      return "bg-[color:var(--good-soft)] text-[color:var(--good)] ring-[#bfe3d2]";
    case "Lost":
    case "Not Eligible":
      return "bg-[color:var(--crit-soft)] text-[color:var(--crit)] ring-[#f3c9c4]";
    case "Not Interested":
      return "bg-[#fbeeeb] text-[#8f3a2c] ring-[#f0cfc7]";
    case "Cold Lead":
      return "bg-[#eef1f5] text-[#4a5568] ring-[#dbe1e9]";
    case "Reactivation":
      return "bg-[color:var(--warn-soft)] text-[color:var(--warn)] ring-[#f0dcbb]";
    default: {
      const i = (OPEN_STATUSES as readonly string[]).indexOf(status);
      const deep = i >= 5;
      return deep
        ? "bg-[#dbe6f6] text-[#1a3a6d] ring-[#bed1ec]"
        : "bg-[#eef2f8] text-[#2d5180] ring-[#d8e1ee]";
    }
  }
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${statusChip(
        status
      )}`}
    >
      {status}
    </span>
  );
}

/** Hot / Warm / Cold, plus the number behind it. */
export function ScorePill({
  score,
  priority,
  size = "md",
}: {
  score: number;
  priority: Priority;
  size?: "sm" | "md";
}) {
  const tone =
    priority === "Hot"
      ? "bg-[color:var(--crit-soft)] text-[color:var(--crit)] ring-[#f3c9c4]"
      : priority === "Warm"
      ? "bg-[color:var(--warn-soft)] text-[color:var(--warn)] ring-[#f0dcbb]"
      : "bg-[color:var(--surface-sunk)] text-[color:var(--text-muted)] ring-[color:var(--line)]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ${tone} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } font-bold`}
    >
      {priority}
      <span className="tabular-nums opacity-70">{score}</span>
    </span>
  );
}

/** Overdue red · due-today orange · completed green · upcoming blue. */
export function dueTone(due: string, todayStr: string): string {
  if (!due) return "text-[color:var(--text-faint)]";
  if (due < todayStr) return "text-[color:var(--crit)] font-semibold";
  if (due === todayStr) return "text-[color:var(--warn)] font-semibold";
  return "text-[color:var(--info)]";
}

export function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatINRShort(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

// ------------------------------- KPI tiles ---------------------------------

export function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  href,
  format,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "neutral" | "good" | "warn" | "crit" | "info";
  href?: string;
  format?: (n: number) => string;
}) {
  const colour =
    tone === "good"
      ? "text-[color:var(--good)]"
      : tone === "warn"
      ? "text-[color:var(--warn)]"
      : tone === "crit"
      ? "text-[color:var(--crit)]"
      : tone === "info"
      ? "text-[color:var(--info)]"
      : "text-[color:var(--text)]";

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[color:var(--text-faint)]">
          {label}
        </span>
        {href && (
          <span className="text-[color:var(--text-faint)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">
            →
          </span>
        )}
      </div>
      <div className={`mt-1 font-display text-[26px] font-extrabold tabular-nums ${colour}`}>
        {format ? format(value) : value.toLocaleString("en-IN")}
      </div>
      {sub && <div className="text-[11.5px] text-[color:var(--text-muted)]">{sub}</div>}
    </>
  );

  if (!href) return <div className="panel p-3.5">{body}</div>;
  return (
    <Link href={href} className="group panel p-3.5 transition hover:border-accent/50 hover:shadow-md">
      {body}
    </Link>
  );
}

// --------------------------------- charts ----------------------------------

/**
 * A ranked bar list. Bars are scaled to the biggest row, not the total —
 * six categories splitting one pie leaves every bar a stub otherwise.
 */
export function BarList({
  title,
  rows,
  colour = "var(--brand)",
  format,
  onPick,
  empty = "Nothing yet.",
}: {
  title: string;
  rows: { label: string; value: number }[];
  colour?: string;
  format?: (n: number) => string;
  onPick?: (label: string) => void;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="panel p-4">
      <h3 className="mb-3 font-display text-[14px] font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[color:var(--text-faint)]">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const inner = (
              <>
                <span className="w-[38%] shrink-0 truncate text-[12.5px] text-[color:var(--text-muted)]">
                  {r.label}
                </span>
                <span className="h-[14px] flex-1 overflow-hidden rounded-[3px] bg-surface-sunk">
                  <span
                    className="block h-full rounded-[3px]"
                    style={{ width: `${(r.value / max) * 100}%`, background: colour }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right font-display text-[12.5px] font-bold tabular-nums">
                  {format ? format(r.value) : r.value}
                </span>
              </>
            );
            return onPick ? (
              <button
                key={r.label}
                onClick={() => onPick(r.label)}
                className="flex w-full items-center gap-2.5 rounded-md px-1 py-0.5 text-left transition hover:bg-surface-sunk"
              >
                {inner}
              </button>
            ) : (
              <div key={r.label} className="flex items-center gap-2.5 px-1">
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A single trend line — months across, count up. */
export function Trend({
  title,
  rows,
  format,
}: {
  title: string;
  rows: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const w = 100;
  const h = 34;
  const pts = rows.map((r, i) => {
    const x = rows.length === 1 ? w / 2 : (i / (rows.length - 1)) * w;
    return `${x},${h - (r.value / max) * h}`;
  });

  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-[14px] font-bold">{title}</h3>
        <span className="font-display text-[15px] font-bold tabular-nums">
          {format ? format(rows.at(-1)?.value ?? 0) : rows.at(-1)?.value ?? 0}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[color:var(--text-faint)]">
          Nothing yet.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="mt-3 h-16 w-full"
            role="img"
            aria-label={title}
          >
            <polyline
              points={pts.join(" ")}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-1 flex justify-between text-[10.5px] text-[color:var(--text-faint)]">
            <span>{rows[0]?.label}</span>
            <span>{rows.at(-1)?.label}</span>
          </div>
        </>
      )}
    </div>
  );
}
