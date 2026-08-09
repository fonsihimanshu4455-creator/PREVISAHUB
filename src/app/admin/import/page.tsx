"use client";

import { useRef, useState } from "react";

type PreviewRow = {
  row: number;
  name: string;
  phone: string;
  country: string;
  counsellor: string;
  stage: string;
  totalFee: number;
  errors: string[];
};

type Preview = {
  mapped: Record<string, string>;
  unmapped: string[];
  validCount: number;
  errorCount: number;
  rows: PreviewRow[];
  totalRows: number;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send(commit: boolean) {
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    if (commit) fd.append("commit", "true");
    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const d = await res.json();
      if (d.error) setError(d.error);
      else if (d.preview) {
        setPreview(d);
        setResult(null);
      } else {
        setResult({ imported: d.imported, skipped: d.skipped });
        setPreview(null);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  function pick(f: File | undefined) {
    setFile(f ?? null);
    setPreview(null);
    setResult(null);
    setError("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">
          Import Students 📥
        </h1>
        <p className="mt-1 text-slate-500">
          Upload an Excel (.xlsx) or CSV file to add many students at once.
          You will see a preview before anything is saved.
        </p>
      </div>

      {/* Expected columns */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-display font-bold text-slate-800">
          What your file should look like
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          The first row must be column headings. Only <b>Name</b> and{" "}
          <b>Phone</b> are required — everything else is optional and fills in a
          sensible default. Column names are matched loosely, so
          &ldquo;Mobile No&rdquo; works the same as &ldquo;Phone&rdquo;.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500">
                {["Name*", "Phone*", "Email", "City", "Country", "Intake", "Counsellor", "Stage", "Test", "Score", "Fee", "Notes"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-600">
                {["Simran Kaur", "+91 98765 43210", "simran@gmail.com", "Ludhiana", "Canada", "Jan 2027", "Neha Gupta", "Documentation", "IELTS", "7.5", "85000", "SOP pending"].map((c, i) => (
                  <td key={i} className="whitespace-nowrap px-3 py-2">{c}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <a
          href="/api/import/template"
          className="mt-3 inline-block text-xs font-semibold text-orange-600 hover:underline"
        >
          ⬇ Download a sample CSV
        </a>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => pick(e.target.files?.[0])}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
        />
        {file && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => send(false)}
              disabled={busy}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? "Reading…" : "Preview"}
            </button>
            {preview && preview.validCount > 0 && (
              <button
                onClick={() => send(true)}
                disabled={busy}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {busy ? "Importing…" : `Import ${preview.validCount} students`}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            ✓ Imported <b>{result.imported}</b> students.
            {result.skipped > 0 && <> {result.skipped} row(s) were skipped because of errors.</>}{" "}
            <a href="/admin/crm" className="font-semibold underline">
              Open the CRM
            </a>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display font-bold text-slate-800">Preview</h3>
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
              {preview.validCount} ready
            </span>
            {preview.errorCount > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                {preview.errorCount} with problems
              </span>
            )}
            <span className="text-xs text-slate-400">
              {preview.totalRows} rows in file
            </span>
          </div>

          <div className="text-xs text-slate-500">
            <b>Columns matched:</b>{" "}
            {Object.entries(preview.mapped)
              .map(([h, f]) => `${h} → ${f}`)
              .join(", ") || "none"}
            {preview.unmapped.length > 0 && (
              <>
                <br />
                <b>Ignored:</b> {preview.unmapped.join(", ")}
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-3 py-2 font-semibold">Row</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold">Country</th>
                  <th className="px-3 py-2 font-semibold">Counsellor</th>
                  <th className="px-3 py-2 font-semibold">Fee</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((r) => (
                  <tr key={r.row} className={r.errors.length ? "bg-red-50/50" : ""}>
                    <td className="px-3 py-2 text-slate-400">{r.row}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700">{r.name || "—"}</td>
                    <td className="px-3 py-2">{r.phone || "—"}</td>
                    <td className="px-3 py-2">{r.country}</td>
                    <td className="px-3 py-2">{r.counsellor}</td>
                    <td className="px-3 py-2">{r.totalFee ? `₹${r.totalFee.toLocaleString("en-IN")}` : "—"}</td>
                    <td className="px-3 py-2">
                      {r.errors.length ? (
                        <span className="text-red-600">{r.errors.join("; ")}</span>
                      ) : (
                        <span className="text-green-600">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.totalRows > preview.rows.length && (
            <p className="text-xs text-slate-400">
              Showing the first {preview.rows.length} rows. All{" "}
              {preview.totalRows} will be processed on import.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
