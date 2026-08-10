import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { studentBelongsTo } from "@/lib/db";
import {
  DOC_KINDS, DocKind, listDocuments, MAX_FILE_BYTES, saveDocument,
} from "@/lib/documents";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const studentId = new URL(req.url).searchParams.get("studentId") ?? undefined;
  try {
    const documents = await listDocuments({
      counsellor: session.role === "staff" ? session.staff.name : undefined,
      studentId,
    });
    return NextResponse.json({ role: session.role, documents });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load documents", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const studentId = String(form.get("studentId") ?? "");
  if (!studentId) {
    return NextResponse.json({ error: "Pick a student first." }, { status: 400 });
  }
  if (
    session.role === "staff" &&
    !(await studentBelongsTo(studentId, session.staff.name))
  ) {
    return NextResponse.json(
      { error: "This student is not assigned to you." },
      { status: 403 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Keep uploads under ${
          MAX_FILE_BYTES / 1024 / 1024
        } MB — scan at a lower quality or split a long PDF.`,
      },
      { status: 400 }
    );
  }

  const kindRaw = String(form.get("kind") ?? "Other");
  const kind: DocKind = DOC_KINDS.includes(kindRaw as DocKind)
    ? (kindRaw as DocKind)
    : "Other";

  try {
    const doc = await saveDocument({
      studentId,
      // Strip any path the browser may include, and keep the name reasonable.
      name: file.name.split(/[\\/]/).pop()!.slice(0, 200),
      kind,
      mime: file.type || "application/octet-stream",
      data: Buffer.from(await file.arrayBuffer()),
      uploadedBy: session.role === "staff" ? session.staff.name : "Admin",
    });
    if (!doc) {
      return NextResponse.json({ error: "No database connected." }, { status: 503 });
    }
    return NextResponse.json({ document: doc });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to save the file", detail: String(e) },
      { status: 500 }
    );
  }
}
