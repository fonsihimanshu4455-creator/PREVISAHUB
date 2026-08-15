// ---------------------------------------------------------------------------
// Student documents — passports, offer letters, score reports, funds proof.
//
// Files are stored as bytea in the same Postgres the rest of the CRM uses, so
// there is no second service to sign up for or configure. That is the right
// trade at this size: a per-file cap keeps rows small, and a consultancy's
// paperwork is a few MB per student, not a media library. If the collection
// ever outgrows the database, only this module has to change — everything
// else goes through these functions.
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto";
import { ensureSchema, schemaGuard, sql } from "./db";

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Categories a consultancy actually files things under. */
export type DocKind =
  | "Passport"
  | "Photo"
  | "Academics"
  | "Score Report"
  | "Offer Letter"
  | "Funds Proof"
  | "Visa"
  | "Other";

export const DOC_KINDS: DocKind[] = [
  "Passport",
  "Photo",
  "Academics",
  "Score Report",
  "Offer Letter",
  "Funds Proof",
  "Visa",
  "Other",
];

/** Metadata only — the bytes are fetched separately, on download. */
export type DocumentMeta = {
  id: string;
  studentId: string;
  studentName: string;
  counsellor: string;
  name: string;
  kind: DocKind;
  mime: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
};

type DocRow = {
  id: string; student_id: string; student_name: string | null;
  counsellor: string | null; name: string; kind: string; mime: string;
  size: string | number; uploaded_by: string | null; uploaded_at: string | Date;
};

function toMeta(r: DocRow): DocumentMeta {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name ?? "",
    counsellor: r.counsellor ?? "",
    name: r.name,
    kind: r.kind as DocKind,
    mime: r.mime,
    size: Number(r.size),
    uploadedBy: r.uploaded_by ?? "",
    uploadedAt: String(r.uploaded_at),
  };
}

// One catalog check on a cold instance rather than the DDL — see schemaGuard.
export const ensureDocumentsSchema = schemaGuard({ tables: ["documents"] }, () => createDocumentsSchema());

async function createDocumentsSchema(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id          text PRIMARY KEY,
      student_id  text NOT NULL,
      name        text NOT NULL,
      kind        text NOT NULL DEFAULT 'Other',
      mime        text NOT NULL,
      size        integer NOT NULL,
      data        bytea NOT NULL,
      uploaded_by text,
      uploaded_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS documents_student_idx ON documents (student_id)`;
}

/**
 * List document metadata. The `data` column is deliberately never selected
 * here — pulling megabytes of file bytes into a listing would be slow and
 * pointless when the page only shows names and sizes.
 */
export async function listDocuments(opts: {
  counsellor?: string;
  studentId?: string;
}): Promise<DocumentMeta[]> {
  if (!sql) return [];
  await ensureSchema();
  await ensureDocumentsSchema();
  const { counsellor = null, studentId = null } = opts;
  const rows = await sql<DocRow[]>`
    SELECT d.id, d.student_id, d.name, d.kind, d.mime, d.size,
           d.uploaded_by, d.uploaded_at,
           s.name AS student_name, s.counsellor
    FROM documents d LEFT JOIN students s ON s.id = d.student_id
    WHERE ${counsellor === null ? sql`TRUE` : sql`lower(s.counsellor) = lower(${counsellor})`}
      AND ${studentId === null ? sql`TRUE` : sql`d.student_id = ${studentId}`}
    ORDER BY d.uploaded_at DESC
    LIMIT 500
  `;
  return rows.map(toMeta);
}

export async function saveDocument(input: {
  studentId: string;
  name: string;
  kind: DocKind;
  mime: string;
  data: Buffer;
  uploadedBy: string;
}): Promise<DocumentMeta | null> {
  if (!sql) return null;
  await ensureSchema();
  await ensureDocumentsSchema();
  const id = `DOC-${randomBytes(6).toString("hex")}`;
  await sql`
    INSERT INTO documents (id, student_id, name, kind, mime, size, data, uploaded_by)
    VALUES (${id}, ${input.studentId}, ${input.name}, ${input.kind},
            ${input.mime}, ${input.data.length}, ${input.data}, ${input.uploadedBy})
  `;
  const [row] = await sql<DocRow[]>`
    SELECT d.id, d.student_id, d.name, d.kind, d.mime, d.size,
           d.uploaded_by, d.uploaded_at,
           s.name AS student_name, s.counsellor
    FROM documents d LEFT JOIN students s ON s.id = d.student_id
    WHERE d.id = ${id}
  `;
  return row ? toMeta(row) : null;
}

/** Fetch one file's bytes for download. */
export async function readDocument(
  id: string
): Promise<{ name: string; mime: string; data: Buffer; counsellor: string } | null> {
  if (!sql) return null;
  await ensureDocumentsSchema();
  const rows = await sql<
    { name: string; mime: string; data: Buffer; counsellor: string | null }[]
  >`
    SELECT d.name, d.mime, d.data, s.counsellor
    FROM documents d LEFT JOIN students s ON s.id = d.student_id
    WHERE d.id = ${id}
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    name: r.name,
    mime: r.mime,
    data: Buffer.from(r.data),
    counsellor: r.counsellor ?? "",
  };
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (!sql) return false;
  await ensureDocumentsSchema();
  const rows = await sql`DELETE FROM documents WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** The counsellor who owns the student this file belongs to. */
export async function documentCounsellor(id: string): Promise<string | null> {
  if (!sql) return null;
  await ensureDocumentsSchema();
  const rows = await sql<{ counsellor: string | null }[]>`
    SELECT s.counsellor FROM documents d
    LEFT JOIN students s ON s.id = d.student_id WHERE d.id = ${id}
  `;
  return rows[0]?.counsellor ?? null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
