import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/authServer";
import { parseImport } from "@/lib/import";
import { createStudent, dbEnabled } from "@/lib/db";
import { setStudentFee } from "@/lib/payments";
import { Student, TODAY } from "@/lib/crm-data";

export const dynamic = "force-dynamic";
// Parsing a spreadsheet is heavier than a normal request.
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 2000;

/**
 * Two-step import. Without `commit`, it parses and returns a preview so the
 * admin can check the column mapping and see which rows would fail. With
 * `commit=true`, the valid rows are inserted; rows with errors are skipped and
 * reported back rather than silently dropped.
 *
 * Admin only — bulk-creating student records is not a staff action.
 */
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
      { error: "File is larger than 5 MB. Split it into smaller files." },
      { status: 400 }
    );
  }
  if (!/\.(xlsx|csv)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Only .xlsx and .csv files are supported. In Excel: File → Save As → .xlsx" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await parseImport(buf, file.name);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `That file has ${parsed.rows.length} rows. Import up to ${MAX_ROWS} at a time.` },
      { status: 400 }
    );
  }

  const commit = String(form.get("commit") ?? "") === "true";
  if (!commit) {
    return NextResponse.json({
      preview: true,
      headers: parsed.headers,
      mapped: parsed.mapped,
      unmapped: parsed.unmapped,
      validCount: parsed.validCount,
      errorCount: parsed.errorCount,
      // Enough to eyeball the mapping without shipping the whole file back.
      rows: parsed.rows.slice(0, 50),
      totalRows: parsed.rows.length,
    });
  }

  if (!dbEnabled) {
    return NextResponse.json(
      { error: "No database connected — connect one before importing." },
      { status: 503 }
    );
  }

  const good = parsed.rows.filter((r) => r.errors.length === 0);
  let imported = 0;
  const failed: { row: number; name: string; reason: string }[] = [];

  for (const r of good) {
    const student: Student = {
      id: `PVH-${Math.floor(1000 + Math.random() * 9000)}`,
      name: r.name,
      phone: r.phone,
      email: r.email || `${r.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      city: r.city,
      country: r.country,
      intake: r.intake,
      counsellor: r.counsellor,
      stage: r.stage,
      testType: r.testType,
      score: r.score,
      targetScore: r.targetScore,
      lastUpdated: TODAY,
      nextFollowUp: TODAY,
      notes: r.notes,
    };
    try {
      const saved = await createStudent(student);
      if (r.totalFee > 0) await setStudentFee(saved.id, r.totalFee);
      imported++;
    } catch (e) {
      failed.push({
        row: r.row,
        name: r.name,
        reason: String(e instanceof Error ? e.message : e).slice(0, 120),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped: parsed.errorCount,
    failed,
  });
}
