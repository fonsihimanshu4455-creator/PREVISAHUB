import { NextRequest, NextResponse } from "next/server";
import { defaultContent, mergeDefaults } from "@/lib/content";
import { readContent, writeContent, storageConfigured } from "@/lib/storage";
import { isAuthed } from "@/lib/authServer";
import { revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/contentCache";

export const dynamic = "force-dynamic";

// Public: read the current site content.
export async function GET() {
  const stored = await readContent();
  return NextResponse.json({
    content: stored ?? defaultContent,
    storage: storageConfigured(),
  });
}

// Protected: save site content (admin only).
export async function PUT(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!storageConfigured()) {
    return NextResponse.json(
      { ok: false, error: "no-storage" },
      { status: 503 }
    );
  }
  try {
    const body = await req.json();
    const merged = mergeDefaults(defaultContent, body.content);
    await writeContent(merged);
    // Every page is rendered from the cached copy, so clear it here — without
    // this the owner would save an edit and not see it on the site.
    revalidateTag(CONTENT_TAG);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
