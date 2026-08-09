"use client";

import { useRef } from "react";
import Link from "next/link";
import { adminNav } from "@/lib/adminNav";
import { useSiteContent } from "@/lib/SiteContentContext";

export default function AdminDashboard() {
  const { exportJson, importJson, reset, storage } = useSiteContent();
  const fileRef = useRef<HTMLInputElement>(null);

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
    const text = await file.text();
    if (await importJson(text)) {
      alert("Content imported successfully ✓");
    } else {
      alert("Could not read that file. Make sure it is a valid backup JSON.");
    }
  };

  const cards = adminNav.filter((n) => n.href !== "/admin");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Welcome 👋</h1>
        <p className="mt-1 text-slate-500">
          Edit every part of your website below. Each section has its own page —
          change text, photos, the logo, colours and sizes, then hit{" "}
          <span className="font-semibold">Save</span>.
        </p>
      </div>

      {/* Storage status */}
      {storage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ <span className="font-semibold">Database connected.</span> Your edits
          are saved on the server and show for <span className="font-semibold">all
          visitors on every device</span>.
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ <span className="font-semibold">No database connected yet.</span> Right
          now edits save only in <span className="font-semibold">this browser</span>.
          To make changes live for everyone from any device, connect a free
          database (see the README → “Make editing work everywhere”). You can still
          log in from anywhere; only saving content needs the database.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-orange-300 hover:shadow-md transition"
          >
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-orange-50 text-2xl">
                {c.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 group-hover:text-orange-600">
                  {c.label}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">{c.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Backup / restore */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <h3 className="font-display text-lg font-bold text-slate-800">Backup & Restore</h3>
        <p className="text-sm text-slate-500 mt-1">
          Download a backup of all your content to keep it safe, or import a
          backup to restore it.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={download}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            ⬇ Download backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ⬆ Import backup
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
              if (
                confirm(
                  "Reset ALL content back to the original defaults? This cannot be undone."
                )
              ) {
                reset();
                alert("Content reset to defaults.");
              }
            }}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            ↺ Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
