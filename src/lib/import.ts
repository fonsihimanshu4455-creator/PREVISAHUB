// ---------------------------------------------------------------------------
// Bulk student import from Excel (.xlsx) or CSV.
//
// Column headers are matched loosely — people export from all sorts of places,
// so "Phone", "phone no", "Mobile Number" and "contact" all mean the same
// thing. Anything unrecognised is ignored rather than failing the whole file.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import { COUNTRIES, Country, TestType, VISA_STAGES, VisaStage } from "./crm-data";

export type ImportRow = {
  row: number;
  name: string;
  phone: string;
  email: string;
  city: string;
  country: Country;
  intake: string;
  counsellor: string;
  stage: VisaStage;
  testType: TestType;
  score: number | null;
  targetScore: number;
  totalFee: number;
  notes: string;
  errors: string[];
};

// Header aliases, lowercased and stripped of anything but letters/numbers.
const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "studentname", "fullname", "student"],
  phone: ["phone", "phoneno", "phonenumber", "mobile", "mobileno", "contact", "whatsapp"],
  email: ["email", "emailid", "mail"],
  city: ["city", "town", "location"],
  country: ["country", "destination", "preferredcountry", "countrypreference"],
  intake: ["intake", "session", "batch"],
  counsellor: ["counsellor", "counselor", "assignedto", "advisor", "agent"],
  stage: ["stage", "status", "visastage", "applicationstatus"],
  testType: ["test", "testtype", "exam", "exampreference"],
  score: ["score", "band", "ieltsscore", "ptescore", "testscore", "marks"],
  targetScore: ["target", "targetscore", "requiredscore", "targetband"],
  totalFee: ["fee", "totalfee", "fees", "amount", "packagefee", "agreedfee"],
  notes: ["notes", "note", "remark", "remarks", "comment", "comments"],
};

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fieldFor(header: string): string | null {
  const n = normaliseHeader(header);
  if (!n) return null;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(n)) return field;
  }
  return null;
}

/** Best-effort match of a free-text value onto one of a fixed set. */
function matchOption<T extends string>(value: string, options: readonly T[]): T | null {
  const v = normaliseHeader(value);
  if (!v) return null;
  for (const o of options) if (normaliseHeader(o) === v) return o;
  for (const o of options) if (normaliseHeader(o).startsWith(v) && v.length >= 3) return o;
  return null;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const v = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (typeof v.text === "string") return v.text;
    if (v.result !== undefined) return String(v.result);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

/** Split one CSV line, honouring quoted fields containing commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function readGrid(buf: Buffer, filename: string): Promise<string[][]> {
  if (/\.csv$/i.test(filename)) {
    const text = buf.toString("utf8").replace(/^﻿/, "");
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim() !== "")
      .map(splitCsvLine);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const grid: string[][] = [];
  ws.eachRow((row) => {
    const values = row.values as unknown[];
    // ExcelJS row.values is 1-indexed with a leading hole.
    grid.push(values.slice(1).map(cellText));
  });
  return grid;
}

export type ParsedImport = {
  headers: string[];
  mapped: Record<string, string>; // column header -> field name
  unmapped: string[];
  rows: ImportRow[];
  validCount: number;
  errorCount: number;
};

export async function parseImport(
  buf: Buffer,
  filename: string
): Promise<ParsedImport | { error: string }> {
  let grid: string[][];
  try {
    grid = await readGrid(buf, filename);
  } catch (e) {
    return {
      error:
        "Could not read that file. Save it as .xlsx or .csv and try again. " +
        String(e instanceof Error ? e.message : e),
    };
  }

  if (grid.length < 2) {
    return { error: "The file needs a header row and at least one student row." };
  }

  const headers = grid[0];
  const mapped: Record<string, string> = {};
  const unmapped: string[] = [];
  const colToField = new Map<number, string>();

  headers.forEach((h, i) => {
    const f = fieldFor(h);
    if (f && !Object.values(mapped).includes(f)) {
      mapped[h] = f;
      colToField.set(i, f);
    } else if (h.trim()) unmapped.push(h);
  });

  if (!Object.values(mapped).includes("name")) {
    return {
      error:
        "No 'Name' column found. The file needs at least a Name and a Phone column.",
    };
  }

  const rows: ImportRow[] = [];
  const seenPhones = new Set<string>();

  for (let r = 1; r < grid.length; r++) {
    const raw = grid[r];
    const get = (field: string): string => {
      for (const [i, f] of colToField) if (f === field) return raw[i] ?? "";
      return "";
    };

    const errors: string[] = [];
    const name = get("name").trim();
    const phone = get("phone").trim();

    if (!name) errors.push("Name is missing");
    if (!phone) errors.push("Phone is missing");
    else if (seenPhones.has(phone)) errors.push("Duplicate phone in this file");
    else seenPhones.add(phone);

    const countryRaw = get("country");
    const country = matchOption(countryRaw, COUNTRIES) ?? "Canada";
    if (countryRaw && !matchOption(countryRaw, COUNTRIES)) {
      errors.push(`Unknown country "${countryRaw}" — will use Canada`);
    }

    const stageRaw = get("stage");
    const stage = matchOption(stageRaw, VISA_STAGES) ?? "Enquiry";

    const testRaw = get("testType");
    const testType =
      matchOption(testRaw, ["IELTS", "PTE", "Not Taken"] as const) ?? "Not Taken";

    const scoreRaw = get("score").trim();
    let score: number | null = null;
    if (scoreRaw) {
      const n = Number(scoreRaw);
      if (Number.isFinite(n)) score = n;
      else errors.push(`Score "${scoreRaw}" is not a number`);
    }

    const feeRaw = get("totalFee").replace(/[₹,\s]/g, "");
    const totalFee = feeRaw && Number.isFinite(Number(feeRaw)) ? Number(feeRaw) : 0;

    const targetRaw = get("targetScore").trim();
    const targetScore =
      targetRaw && Number.isFinite(Number(targetRaw))
        ? Number(targetRaw)
        : testType === "PTE"
        ? 65
        : 6.0;

    rows.push({
      row: r + 1, // 1-based, matching what the user sees in Excel
      name,
      phone,
      email: get("email").trim(),
      city: get("city").trim() || "—",
      country,
      intake: get("intake").trim() || "—",
      counsellor: get("counsellor").trim() || "Rohit Sharma",
      stage,
      testType: testType as TestType,
      score: testType === "Not Taken" ? null : score,
      targetScore,
      totalFee,
      notes: get("notes").trim() || "Imported from file.",
      errors,
    });
  }

  return {
    headers,
    mapped,
    unmapped,
    rows,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
  };
}
