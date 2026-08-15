import { NextResponse } from "next/server";
import { guard } from "@/lib/leads/auth";
import { commitLeadImport, parseLeadImport } from "@/lib/leads/import";

export const dynamic = "force-dynamic";
// Reading a couple of thousand rows out of a spreadsheet takes longer than a
// normal request.
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_ROWS = 5000;

/**
 * Two passes over the same file. Without `commit`, it parses and hands back
 * what it found — which column it took for the phone, which rows will not go
 * in, and why — so the owner sees it before anything is written. With
 * `commit=true`, the good rows go in and the rest are reported back rather
 * than silently dropped.
 */
export async function POST(req: Request) {
  // Bulk-loading the board is a manager's job, not an executive's.
  const user = await guard("leads:assign");
  if ("status" in user) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 8 MB. Split it and upload in parts." },
      { status: 400 }
    );
  }

  const parsed = await parseLeadImport(
    Buffer.from(await file.arrayBuffer()),
    file.name,
    {
      source: String(form.get("source") ?? ""),
      status: String(form.get("status") ?? ""),
      owner: String(form.get("owner") ?? ""),
    }
  );
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.rows.length > MAX_ROWS) {
    return NextResponse.json(
      {
        error: `That sheet has ${parsed.rows.length} rows. Import up to ${MAX_ROWS} at a time.`,
      },
      { status: 400 }
    );
  }

  if (String(form.get("commit")) !== "true") {
    // Preview: send back the mapping, the counts, and a sample of the rows —
    // not all five thousand, which nobody reads and which would be a slow
    // response for no benefit.
    return NextResponse.json({
      preview: true,
      headers: parsed.headers,
      mapped: parsed.mapped,
      unmapped: parsed.unmapped,
      notes: parsed.notes,
      unnamedCount: parsed.unnamedCount,
      mergedCount: parsed.mergedCount,
      validCount: parsed.validCount,
      errorCount: parsed.errorCount,
      duplicateCount: parsed.duplicateCount,
      total: parsed.rows.length,
      rows: parsed.rows.slice(0, 25),
      problems: parsed.rows.filter((r) => r.errors.length > 0).slice(0, 50),
    });
  }

  try {
    const result = await commitLeadImport(parsed, user.name);
    return NextResponse.json({ ...result, total: parsed.rows.length });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not save the leads", detail: String(e) },
      { status: 500 }
    );
  }
}
