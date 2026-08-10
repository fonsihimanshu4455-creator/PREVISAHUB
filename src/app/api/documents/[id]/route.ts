import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { deleteDocument, documentCounsellor, readDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

/**
 * Types that are safe to render in the browser from our own origin. Anything
 * else — HTML, SVG, Office files — is forced to download instead: served
 * inline, a crafted file could run script on this origin and reach the admin
 * session cookie.
 */
const INLINE_SAFE = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** Download a file, or view it in the browser with ?view=1. */
export async function GET(
  req: Request,
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

  const wantsView = new URL(req.url).searchParams.get("view") === "1";
  const inline = wantsView && INLINE_SAFE.has(doc.mime);

  return new NextResponse(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${doc.name.replace(
        /"/g,
        ""
      )}"`,
      "Content-Length": String(doc.data.length),
      "Cache-Control": "private, no-store",
      // Never let the browser second-guess the stored type…
      "X-Content-Type-Options": "nosniff",
      // …and give the response no privileges of its own if it is rendered.
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; object-src 'none'; sandbox",
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
