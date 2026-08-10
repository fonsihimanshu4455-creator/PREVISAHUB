import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { deleteDocument, documentCounsellor, readDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

/** Download a file. Staff may only fetch documents of their own students. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const doc = await readDocument(params.id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    session.role === "staff" &&
    doc.counsellor.toLowerCase() !== session.staff.name.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "This document is not on one of your students." },
      { status: 403 }
    );
  }

  return new NextResponse(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime,
      // `attachment` so a PDF or image downloads rather than rendering in a
      // tab from our own origin.
      "Content-Disposition": `attachment; filename="${doc.name.replace(/"/g, "")}"`,
      "Content-Length": String(doc.data.length),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (session.role === "staff") {
    const owner = await documentCounsellor(params.id);
    if (!owner || owner.toLowerCase() !== session.staff.name.toLowerCase()) {
      return NextResponse.json(
        { error: "This document is not on one of your students." },
        { status: 403 }
      );
    }
  }
  const ok = await deleteDocument(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
