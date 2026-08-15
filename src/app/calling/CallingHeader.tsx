"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";

export default function CallingHeader({ name }: { name: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Icon name="phone" className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[13.5px] font-bold">Pre Visa Hub</div>
            <div className="text-[9.5px] tracking-[0.18em] text-[color:var(--text-faint)]">
              CALLING PANEL
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13.5px] text-[color:var(--text-muted)] sm:inline">
            {name}
          </span>
          <button
            onClick={async () => {
              await fetch("/api/staff-logout", { method: "POST" });
              router.refresh();
            }}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-[12.5px] font-semibold text-[color:var(--text-muted)] transition hover:bg-surface-sunk"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
