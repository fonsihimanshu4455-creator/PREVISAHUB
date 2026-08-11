"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminNav } from "@/lib/adminNav";
import { useSiteContent } from "@/lib/SiteContentContext";
import Icon from "@/components/admin/Icon";
import Stat from "@/components/admin/Stat";
import { formatINR, formatINRShort, stageFill, VISA_STAGES, VisaStage } from "@/lib/crm-data";

type Overview = {
  total: number;
  byStage: Record<string, number>;
  dueCount: number;
  due: { id: string; name: string; notes: string; phone: string }[];
};

export default function AdminDashboard() {
  const { exportJson, importJson, reset, storage } = useSiteContent();
  const fileRef = useRef<HTMLInputElement>(null);

  const [ov, setOv] = useState<Overview | null>(null);
  const [pending, setPending] = useState(0);
  const [collected, setCollected] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // One aggregated request covers the whole page.
        const ro = await fetch("/api/overview").then((r) => r.json());
        if (typeof ro?.total === "number") setOv(ro);
        if (typeof ro?.pending === "number") setPending(ro.pending);
        if (typeof ro?.collected === "number") setCollected(ro.collected);
      } catch {
        /* the shortcuts below still work without figures */
      }
      setLoaded(true);
    })();
  }, []);

  const total = ov?.total ?? 0;
  const dueToday = ov?.due ?? [];
  const dueCount = ov?.dueCount ?? 0;
  const stageCount = (st: VisaStage) => ov?.byStage?.[st] ?? 0;
  const approved = stageCount("Approved");
  const inProgress = VISA_STAGES.filter(
    (st) => !["Approved", "Rejected", "Enquiry"].includes(st)
  ).reduce((a, st) => a + stageCount(st), 0);

  const byStage = VISA_STAGES.map((st) => ({ stage: st, count: stageCount(st) }));
  const maxStage = Math.max(1, ...byStage.map((s) => s.count));

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "previsahub-content.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (await importJson(await file.text())) alert("Content imported successfully ✓");
    else alert("Could not read that file. Make sure it is a valid backup JSON.");
  };

  const shortcuts = adminNav.filter((n) =>
    ["/admin/crm", "/admin/crm?tab=calling", "/admin/sales", "/admin/crm?tab=attendance"].includes(
      n.href
    )
  );

  return (
    <div className="space-y-7">
      {/* Page head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-1 font-display text-display-lg font-bold">
            {greeting()}
          </h1>
          <p className="mt-1 text-[14px] text-[color:var(--text-muted)]">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {loaded && total > 0 && (
              <> · {dueCount} follow-up{dueCount === 1 ? "" : "s"} due</>
            )}
          </p>
        </div>
        <Link
          href="/admin/crm"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
        >
          <Icon name="students" className="h-4 w-4" />
          Open CRM
        </Link>
      </div>

      {!storage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-[13.5px] text-[color:var(--warn)]">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>No database connected.</b> Edits save only in this browser. Add a{" "}
            <code className="rounded bg-white/60 px-1">DATABASE_URL</code> in Vercel
            to make them live everywhere.
          </span>
        </div>
      )}

      {/* Figures */}
      <div className="grid grid-cols-2 gap-3 stagger xl:grid-cols-4">
        <Stat label="Students" value={total} sub={`${inProgress} in progress`} />
        <Stat label="Follow-ups due" value={dueCount} sub="today" tone={dueCount ? "warn" : "neutral"} />
        <Stat label="Pending fees" value={pending} sub="outstanding" tone={pending ? "crit" : "neutral"} format={formatINRShort} title={formatINR(pending)} />
        <Stat label="Collected" value={collected} sub={`${approved} visas approved`} tone="good" format={formatINRShort} title={formatINR(collected)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Pipeline */}
        <section className="panel lg:col-span-3">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display text-[15px] font-bold">Visa pipeline</h2>
            <Link
              href="/admin/crm"
              prefetch={false}
              className="text-[12.5px] font-semibold text-accent hover:underline"
            >
              Open board
            </Link>
          </header>
          <div className="space-y-2.5 px-5 py-4">
            {byStage.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-[112px] shrink-0 text-[12.5px] text-[color:var(--text-muted)]">
                  {stage}
                </span>
                <div className="h-[18px] flex-1 overflow-hidden rounded-[4px] bg-surface-sunk">
                  <div
                    className="h-full rounded-[4px] animate-grow-x"
                    style={{
                      width: `${(count / maxStage) * 100}%`,
                      background: stageFill(stage),
                    }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right font-display text-[13px] font-bold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
            {loaded && total === 0 && (
              <p className="py-6 text-center text-[13.5px] text-[color:var(--text-faint)]">
                No students yet.{" "}
                <Link href="/admin/import" prefetch={false} className="font-semibold text-accent hover:underline">
                  Import a list
                </Link>{" "}
                to get started.
              </p>
            )}
          </div>
        </section>

        {/* Due today */}
        <section className="panel lg:col-span-2">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display text-[15px] font-bold">Due today</h2>
            <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[11px] font-bold tabular-nums text-[color:var(--text-muted)]">
              {dueCount}
            </span>
          </header>
          <div className="divide-y divide-line">
            {dueToday.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{s.name}</div>
                  <div className="truncate text-[12px] text-[color:var(--text-faint)]">
                    {s.notes}
                  </div>
                </div>
                <a
                  href={`https://wa.me/${s.phone?.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-[color:var(--text-muted)] transition hover:border-good hover:text-[color:var(--good)]"
                >
                  Message
                </a>
              </div>
            ))}
            {loaded && dueCount === 0 && (
              <p className="px-5 py-10 text-center text-[13.5px] text-[color:var(--text-faint)]">
                Nothing due — you&apos;re clear.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Shortcuts */}
      <section>
        <h2 className="eyebrow mb-2.5">Jump to</h2>
        <div className="grid gap-2.5 stagger sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              prefetch={false}
              className="group panel flex items-start gap-3 px-4 py-3.5 transition hover:border-line-strong hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_-8px_rgba(16,24,40,.12)]"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunk text-[color:var(--text-muted)] transition-colors group-hover:bg-accent-soft group-hover:text-accent">
                <Icon name={c.icon} className="h-[17px] w-[17px]" />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold">{c.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[color:var(--text-faint)]">
                  {c.desc}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Backup */}
      <section className="panel px-5 py-4">
        <h2 className="font-display text-[15px] font-bold">Backup &amp; restore</h2>
        <p className="mt-1 text-[13px] text-[color:var(--text-muted)]">
          Download a copy of your website content, or restore one.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button onClick={download} className="btn-ghost">
            Download backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <button
            onClick={() => {
              if (confirm("Reset ALL website content to defaults? This cannot be undone.")) {
                reset();
                alert("Content reset to defaults.");
              }
            }}
            className="rounded-lg border border-crit/30 px-3.5 py-2 text-[13px] font-semibold text-[color:var(--crit)] transition hover:bg-crit-soft"
          >
            Reset to defaults
          </button>
        </div>
      </section>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
