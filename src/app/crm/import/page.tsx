"use client";

// Drop a sheet in, the CRM works out the columns.
//
// Nothing is written until the owner has seen what it found — which column it
// took for the phone number, how many rows will go in, and which will not and
// why. An old sheet is usually messy, so being told "180 in, 20 already on the
// board" beforehand is the difference between trusting this and not.

import { useRef, useState } from "react";
import Link from "next/link";
import { useCrm } from "@/components/salescrm/Shell";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/leads/types";
import type { LeadImportRow } from "@/lib/leads/import";

type Preview = {
  headers: string[];
  mapped: Record<string, string>;
  unmapped: string[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  total: number;
  rows: LeadImportRow[];
  problems: LeadImportRow[];
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name", phone: "Mobile", whatsapp: "WhatsApp", email: "Email",
  city: "City", destination: "Destination", visaType: "Visa type",
  source: "Source", status: "Status", owner: "Assigned to",
  education: "Education", occupation: "Occupation", budget: "Budget",
  lastContactDate: "Last contact", notes: "Notes",
};

const control =
  "rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-accent";

export default function ImportLeadsPage() {
  const { team } = useCrm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState({
    source: "Old Database",
    status: "Cold Lead",
    owner: "",
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);

  async function send(commit: boolean) {
    if (!file) return setError("Choose a file first.");
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("source", opts.source);
    body.set("status", opts.status);
    body.set("owner", opts.owner);
    if (commit) body.set("commit", "true");
    try {
      const r = await fetch("/api/crm/import", { method: "POST", body }).then((x) => x.json());
      if (r.error) setError(r.error);
      else if (commit) {
        setDone({ imported: r.imported, skipped: r.skipped });
        setPreview(null);
      } else {
        setPreview(r);
        setDone(null);
      }
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setDone(null);
    setError("");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Old database</p>
        <h1 className="mt-1 font-display text-display-lg font-bold">Import a leads sheet</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
          Upload the file as it is. The CRM finds the name and mobile columns
          itself — you do not have to rename or rearrange anything.
        </p>
      </div>

      {/* 1. the file */}
      <div className="panel p-5">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-line-strong px-6 py-10 text-center transition hover:border-accent hover:bg-accent-soft"
        >
          <div className="font-display text-[15px] font-bold">
            {file ? file.name : "Drop your Excel or CSV file here"}
          </div>
          <div className="mt-1 text-[13px] text-[color:var(--text-muted)]">
            {file
              ? `${(file.size / 1024).toFixed(0)} KB — click to choose a different file`
              : "or click to choose · .xlsx or .csv · up to 8 MB"}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">
              Where these came from
            </span>
            <select
              className={`${control} w-full`}
              value={opts.source}
              onChange={(e) => setOpts({ ...opts, source: e.target.value })}
            >
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">
              File them as
            </span>
            <select
              className={`${control} w-full`}
              value={opts.status}
              onChange={(e) => setOpts({ ...opts, status: e.target.value })}
            >
              {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold text-[color:var(--text-muted)]">
              Assign to
            </span>
            <select
              className={`${control} w-full`}
              value={opts.owner}
              onChange={(e) => setOpts({ ...opts, owner: e.target.value })}
            >
              <option value="">Nobody yet</option>
              {team.map((t) => <option key={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-[12px] text-[color:var(--text-faint)]">
          These are only used where the sheet does not say. A Status or Source
          column in your file wins.
        </p>

        <button
          onClick={() => send(false)}
          disabled={!file || busy}
          className="mt-4 rounded-xl bg-[color:var(--ink-800)] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-125 disabled:opacity-50"
        >
          {busy ? "Reading the sheet…" : "Check the file"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-[color:var(--crit-soft)] px-4 py-3 text-[13.5px] text-[color:var(--crit)]">
          {error}
        </div>
      )}

      {done && (
        <div className="panel p-5">
          <h2 className="font-display text-[15px] font-bold text-[color:var(--good)]">
            {done.imported} lead{done.imported === 1 ? "" : "s"} imported
          </h2>
          <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
            {done.skipped > 0
              ? `${done.skipped} row${done.skipped === 1 ? " was" : "s were"} skipped — already on the board, or missing a name or number.`
              : "Every row went in."}{" "}
            They have no follow-up date, so nobody&apos;s queue just filled up;
            pick one up and it gets one.
          </p>
          <Link
            href={`/crm/leads?status=${encodeURIComponent(opts.status)}`}
            className="mt-3 inline-block rounded-xl bg-accent px-4 py-2 text-[13.5px] font-semibold text-white"
          >
            See the imported leads →
          </Link>
        </div>
      )}

      {/* 2. what it found */}
      {preview && (
        <>
          <div className="panel p-5">
            <h2 className="font-display text-[15px] font-bold">What the CRM found</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="font-display text-2xl font-extrabold tabular-nums">{preview.total}</div>
                <div className="text-[12px] text-[color:var(--text-muted)]">rows in the file</div>
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold tabular-nums text-[color:var(--good)]">
                  {preview.validCount}
                </div>
                <div className="text-[12px] text-[color:var(--text-muted)]">will be imported</div>
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold tabular-nums text-[color:var(--warn)]">
                  {preview.duplicateCount}
                </div>
                <div className="text-[12px] text-[color:var(--text-muted)]">already on the board</div>
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold tabular-nums text-[color:var(--crit)]">
                  {preview.errorCount}
                </div>
                <div className="text-[12px] text-[color:var(--text-muted)]">will be skipped</div>
              </div>
            </div>

            <h3 className="mt-5 text-[12px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]">
              Columns it recognised
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(preview.mapped).map(([header, field]) => (
                <span
                  key={header}
                  className="rounded-full bg-[color:var(--good-soft)] px-3 py-1 text-[12px] font-semibold text-[color:var(--good)] ring-1 ring-[#bfe3d2]"
                >
                  {header} → {FIELD_LABELS[field] ?? field}
                </span>
              ))}
            </div>
            {preview.unmapped.length > 0 && (
              <>
                <h3 className="mt-4 text-[12px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]">
                  Columns it will ignore
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preview.unmapped.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-surface-sunk px-3 py-1 text-[12px] text-[color:var(--text-muted)] ring-1 ring-[color:var(--line)]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="panel overflow-hidden">
            <h2 className="px-4 pt-4 font-display text-[14px] font-bold">
              First {preview.rows.length} rows, as they will be saved
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="data-table w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Mobile</th>
                    <th className="px-3 py-2 text-left">Destination</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Owner</th>
                    <th className="px-3 py-2 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.row} className={r.errors.length ? "opacity-50" : ""}>
                      <td className="px-4 py-2 tabular-nums text-[color:var(--text-faint)]">{r.row}</td>
                      <td className="px-3 py-2 font-medium">{r.name || "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{r.phone || "—"}</td>
                      <td className="px-3 py-2 text-[color:var(--text-muted)]">{r.destination || "—"}</td>
                      <td className="px-3 py-2 text-[color:var(--text-muted)]">{r.status}</td>
                      <td className="px-3 py-2 text-[color:var(--text-muted)]">{r.owner || "—"}</td>
                      <td className="px-3 py-2 text-[12px]">
                        {r.errors.length > 0 ? (
                          <span className="text-[color:var(--crit)]">{r.errors.join("; ")}</span>
                        ) : r.warnings.length > 0 ? (
                          <span className="text-[color:var(--warn)]">{r.warnings.join("; ")}</span>
                        ) : (
                          <span className="text-[color:var(--good)]">ok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.problems.length > 0 && (
            <div className="panel p-5">
              <h2 className="font-display text-[14px] font-bold">
                Rows that will be skipped
              </h2>
              <ul className="mt-2 space-y-1 text-[13px] text-[color:var(--text-muted)]">
                {preview.problems.map((p) => (
                  <li key={p.row}>
                    <span className="tabular-nums text-[color:var(--text-faint)]">Row {p.row}</span>{" "}
                    {p.name || "(no name)"} — {p.errors.join("; ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => send(true)}
              disabled={busy || preview.validCount === 0}
              className="rounded-xl bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
            >
              {busy
                ? "Importing…"
                : `Import ${preview.validCount} lead${preview.validCount === 1 ? "" : "s"}`}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="rounded-xl border border-line-strong px-4 py-2.5 text-[13.5px] font-semibold text-[color:var(--text-muted)]"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
