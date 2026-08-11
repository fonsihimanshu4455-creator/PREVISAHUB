"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";

/**
 * A figure that counts up on first paint. The motion is short and eased out,
 * so it reads as the number settling rather than a slot machine — and it is
 * skipped entirely when the reader has asked for reduced motion.
 */
export function useCountUp(target: number, duration = 750): number {
  const [value, setValue] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target === 0) {
      setValue(target);
      return;
    }
    // Re-run on a changed target, but only animate from zero the first time;
    // later updates jump, because a refresh is not an entrance.
    if (started.current) {
      setValue(target);
      return;
    }
    started.current = true;

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export type StatTone = "neutral" | "good" | "warn" | "crit" | "accent" | "info";

const TONE: Record<StatTone, string> = {
  neutral: "text-[color:var(--text)]",
  good: "text-[color:var(--good)]",
  warn: "text-[color:var(--warn)]",
  crit: "text-[color:var(--crit)]",
  accent: "text-[color:var(--accent)]",
  info: "text-[color:var(--info)]",
};

/**
 * A single figure with its label. `format` wraps the counted number, so money
 * animates as money rather than counting through unformatted digits.
 */
export default function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  format,
  size = "md",
  title,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: StatTone;
  format?: (n: number) => string;
  size?: "md" | "lg";
  /** Exact value, shown on hover when the headline is abbreviated. */
  title?: string;
  /** Makes the tile a link through to the list it counts. */
  href?: string;
}) {
  const n = useCountUp(value);

  const body = (
    <>
      <div className="flex items-center gap-1.5">
        <span className="eyebrow">{label}</span>
        {href && (
          <Icon
            name="chevron"
            className="h-3 w-3 -rotate-90 text-[color:var(--text-faint)] opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={2.6}
          />
        )}
      </div>
      <div
        title={title}
        className={`mt-1.5 font-display tabular-nums ${
          size === "lg" ? "text-stat-lg" : "text-stat"
        } font-bold ${TONE[tone]}`}
      >
        {format ? format(n) : n.toLocaleString("en-IN")}
      </div>
      {sub && (
        <div className="mt-0.5 text-[12.5px] text-[color:var(--text-muted)]">{sub}</div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group panel px-4 py-3.5 transition hover:border-line-strong hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_-8px_rgba(16,24,40,.12)]"
      >
        {body}
      </Link>
    );
  }
  return <div className="panel px-4 py-3.5">{body}</div>;
}
