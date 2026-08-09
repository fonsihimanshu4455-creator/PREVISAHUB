import { NextResponse } from "next/server";
import { dbEnabled, initDb } from "@/lib/db";
import { isAuthed } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// One-time setup: creates the CRM tables and loads the starter rows.
//
// Run it either way:
//   • logged into /admin — the admin session is enough, no token needed
//   • otherwise         — GET|POST /api/seed?token=YOUR_SEED_TOKEN
//
// Idempotent: the seed only runs when the tables are empty, so it is safe to
// call more than once.
async function handle(req: Request) {
  if (!dbEnabled) {
    return NextResponse.json(
      {
        ok: false,
        error: "DATABASE_URL is not configured — the CRM is running on demo data.",
      },
      { status: 400 }
    );
  }

  const token = new URL(req.url).searchParams.get("token");
  const required = process.env.SEED_TOKEN;
  const tokenOk = !!required && token === required;

  if (!tokenOk && !(await isAuthed())) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unauthorized. Log in at /admin first, or add ?token=<SEED_TOKEN> to this URL.",
      },
      { status: 401 }
    );
  }

  try {
    const { seeded } = await initDb();
    return NextResponse.json({
      ok: true,
      seeded,
      message: seeded
        ? "Tables created and starter data loaded."
        : "Tables ready — data already present, nothing to seed.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Setup failed", detail: String(e) },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
