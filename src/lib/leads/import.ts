// ---------------------------------------------------------------------------
// Bulk lead import — the old database.
//
// An old leads sheet is nothing like a clean export. It has whatever columns
// somebody typed years ago, duplicates of numbers already on the board, blank
// rows, and phone numbers written six different ways. So this parses
// generously, checks everything before writing anything, and tells the owner
// exactly which rows will not go in and why — rather than importing half a
// file and leaving them to work out what happened.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { matchOption, normaliseHeader, readGrid } from "../import";
import { ensureLeadSchema } from "./schema";
import {
  DESTINATIONS, LEAD_SOURCES, LEAD_STATUSES, LeadSource, LeadStatus,
  VISA_TYPES, VisaType,
} from "./types";

export type LeadImportRow = {
  row: number;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  destination: string;
  visaType: VisaType;
  source: LeadSource;
  status: LeadStatus;
  owner: string;
  education: string;
  occupation: string;
  budget: number | null;
  lastContactDate: string;
  notes: string;
  /** Blocking — the row will be skipped. */
  errors: string[];
  /** Non-blocking — the row goes in, with a substitution. */
  warnings: string[];
};

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "leadname", "clientname", "studentname", "fullname", "student", "client"],
  phone: ["phone", "phoneno", "phonenumber", "mobile", "mobileno", "mob", "contact", "contactno", "number"],
  whatsapp: ["whatsapp", "whatsappno", "whatsappnumber", "wa"],
  email: ["email", "emailid", "mail", "emailaddress"],
  city: ["city", "town", "location", "place", "district"],
  destination: ["country", "destination", "preferredcountry", "countrypreference", "interestedcountry"],
  visaType: ["visa", "visatype", "category", "service", "interest", "requirement"],
  source: ["source", "leadsource", "campaign", "channel", "reference", "from"],
  status: ["status", "leadstatus", "stage", "result", "outcome"],
  owner: ["owner", "assignedto", "counsellor", "counselor", "executive", "agent", "handledby", "telecaller"],
  education: ["education", "qualification", "degree", "study"],
  occupation: ["occupation", "job", "work", "profession"],
  budget: ["budget", "fee", "fees", "amount", "package"],
  lastContactDate: ["lastcontact", "lastcontacted", "lastcalldate", "date", "calldate", "lastcalled"],
  notes: ["notes", "note", "remark", "remarks", "comment", "comments", "feedback"],
};

function fieldFor(header: string): string | null {
  const n = normaliseHeader(header);
  if (!n) return null;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(n)) return field;
  }
  return null;
}

/**
 * Match a cell onto one of a fixed set, by shared words rather than by the
 * whole string. Old sheets say "Student Visa", "Tourist visa", "PR Application"
 * where the CRM says "Student", "Visitor / Tourist", "Permanent Residence" —
 * exact matching sends all of that to Other, which is how an import ends up
 * looking useless. Filler words are dropped so they cannot match on their own.
 */
const FILLER = new Set(["visa", "visas", "permit", "application", "type", "for", "the"]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !FILLER.has(w));
}

export function matchLoose<T extends string>(
  value: string,
  options: readonly T[]
): T | null {
  const exact = matchOption(value, options);
  if (exact) return exact;
  const vw = words(value);
  if (vw.length === 0) return null;
  let best: { option: T; hits: number } | null = null;
  for (const o of options) {
    const ow = words(o);
    const hits = ow.filter((w) => vw.includes(w)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { option: o, hits };
  }
  return best ? best.option : null;
}

/** The last ten digits — the only part of a phone number people write consistently. */
export function phoneKey(phone: string): string {
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

/** Anything that looks like a date, as YYYY-MM-DD. "" when it does not. */
function asDate(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // dd/mm/yyyy and dd-mm-yyyy, which is what an Indian office sheet holds.
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const t = Date.parse(v);
  return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
}

export type ParsedLeadImport = {
  headers: string[];
  mapped: Record<string, string>;
  unmapped: string[];
  rows: LeadImportRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
};

export type ImportDefaults = {
  /** Where the whole sheet came from — usually "Old Database". */
  source?: string;
  /** What to file them as. Old sheets are normally Cold Lead. */
  status?: string;
  /** Who picks them up. Blank means unassigned. */
  owner?: string;
};

/**
 * Parse and check the file. Nothing is written — the caller shows this back to
 * the owner first, then calls `commitLeadImport` with the same file.
 *
 * Numbers already on the board are flagged as duplicates rather than errors:
 * re-uploading last year's sheet on top of this year's live leads is the
 * normal case, not a mistake, and those rows are simply skipped.
 */
export async function parseLeadImport(
  buf: Buffer,
  filename: string,
  defaults: ImportDefaults = {}
): Promise<ParsedLeadImport | { error: string }> {
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
    return { error: "The file needs a header row and at least one lead below it." };
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
        `No Name column found. The columns in your file are: ${headers
          .filter((h) => h.trim())
          .join(", ")}. Rename one to "Name" and add a "Phone" column.`,
    };
  }
  if (!Object.values(mapped).includes("phone")) {
    return {
      error:
        `No Phone column found. The columns in your file are: ${headers
          .filter((h) => h.trim())
          .join(", ")}. Rename one to "Phone" or "Mobile".`,
    };
  }

  // Everything already on the board, so duplicates are named, not guessed at.
  const existing = new Map<string, string>();
  if (sql) {
    await ensureLeadSchema();
    const rows = await sql<{ k: string; name: string }[]>`
      SELECT right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) AS k, name
      FROM leads WHERE phone <> ''
    `;
    for (const r of rows) existing.set(r.k, r.name);
  }

  const defaultSource =
    matchOption(defaults.source ?? "", LEAD_SOURCES) ?? "Old Database";
  const defaultStatus =
    matchOption(defaults.status ?? "", LEAD_STATUSES) ?? "Cold Lead";

  const rows: LeadImportRow[] = [];
  const seen = new Map<string, number>();
  let duplicateCount = 0;

  for (let r = 1; r < grid.length; r++) {
    const raw = grid[r];
    if (raw.every((c) => !String(c ?? "").trim())) continue; // blank row
    const get = (field: string): string => {
      for (const [i, f] of colToField) if (f === field) return String(raw[i] ?? "").trim();
      return "";
    };

    const errors: string[] = [];
    const warnings: string[] = [];
    const name = get("name");
    const phone = get("phone");
    const key = phoneKey(phone);

    if (!name) errors.push("Name is missing");
    if (!phone) errors.push("Phone is missing");
    else if (key.length < 10) errors.push(`"${phone}" is not a full phone number`);
    else if (seen.has(key)) {
      errors.push(`Same number as row ${seen.get(key)} in this file`);
      duplicateCount++;
    } else if (existing.has(key)) {
      errors.push(`Already on the board as ${existing.get(key)}`);
      duplicateCount++;
    } else seen.set(key, r + 1);

    const destRaw = get("destination");
    const destination = matchLoose(destRaw, DESTINATIONS) ?? destRaw ?? "";

    const visaRaw = get("visaType");
    const visaType = matchLoose(visaRaw, VISA_TYPES) ?? "Other";
    if (visaRaw && !matchLoose(visaRaw, VISA_TYPES)) {
      warnings.push(`Visa type "${visaRaw}" not recognised — filed as Other`);
    }

    const sourceRaw = get("source");
    const source = matchLoose(sourceRaw, LEAD_SOURCES) ?? defaultSource;

    const statusRaw = get("status");
    const status = matchLoose(statusRaw, LEAD_STATUSES) ?? defaultStatus;
    if (statusRaw && !matchLoose(statusRaw, LEAD_STATUSES)) {
      warnings.push(`Status "${statusRaw}" not recognised — filed as ${defaultStatus}`);
    }

    const budgetRaw = get("budget").replace(/[^0-9.]/g, "");
    const budget = budgetRaw ? Number(budgetRaw) : null;

    rows.push({
      row: r + 1,
      name,
      phone,
      whatsapp: get("whatsapp") || phone,
      email: get("email"),
      city: get("city"),
      destination,
      visaType,
      source,
      status,
      owner: get("owner") || defaults.owner || "",
      education: get("education"),
      occupation: get("occupation"),
      budget: budget !== null && Number.isFinite(budget) ? budget : null,
      lastContactDate: asDate(get("lastContactDate")),
      notes: get("notes"),
      errors,
      warnings,
    });
  }

  return {
    headers,
    mapped,
    unmapped,
    rows,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
    duplicateCount,
  };
}

/**
 * Write the rows that passed. Done as one statement so a sheet of two thousand
 * leads is one round trip rather than two thousand, and so a failure part-way
 * cannot leave half a file imported.
 */
export async function commitLeadImport(
  parsed: ParsedLeadImport,
  actor: string
): Promise<{ imported: number; skipped: number }> {
  const good = parsed.rows.filter((r) => r.errors.length === 0);
  if (!sql || good.length === 0) {
    return { imported: 0, skipped: parsed.rows.length - good.length };
  }
  await ensureLeadSchema();

  const now = new Date();
  const records = good.map((r, i) => ({
    // Time-based so the ids of one import sort together, with the row index
    // keeping them unique inside the same millisecond.
    id: `LD-${now.getTime().toString(36).toUpperCase().slice(-5)}${i
      .toString(36)
      .toUpperCase()
      .padStart(3, "0")}`,
    source: r.source,
    name: r.name,
    phone: r.phone,
    whatsapp: r.whatsapp,
    email: r.email,
    city: r.city,
    destination: r.destination,
    visa_type: r.visaType,
    education: r.education,
    occupation: r.occupation,
    budget: r.budget,
    owner: r.owner,
    status: r.status,
    last_contact_date: r.lastContactDate,
    notes: r.notes,
    // Deliberately no follow-up date: an old sheet of two thousand names must
    // not land in somebody's "due today" queue on the morning it is imported.
    // They are worked from the Old Database screen, and get a follow-up the
    // moment someone actually picks one up.
    next_follow_up_date: "",
  }));

  await sql`
    INSERT INTO leads ${sql(
      records,
      "id", "source", "name", "phone", "whatsapp", "email", "city",
      "destination", "visa_type", "education", "occupation", "budget",
      "owner", "status", "last_contact_date", "notes", "next_follow_up_date"
    )}
    ON CONFLICT DO NOTHING
  `;

  await sql`
    INSERT INTO lead_activities ${sql(
      records.map((r) => ({
        lead_id: r.id,
        kind: "created",
        summary: `Imported from a ${r.source} sheet`,
        detail: "",
        actor,
      })),
      "lead_id", "kind", "summary", "detail", "actor"
    )}
  `;

  return { imported: records.length, skipped: parsed.rows.length - good.length };
}
