import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/authServer";
import { sql, describeConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; detail: string };

/**
 * Diagnoses the CRM database connection and reports, in order, the things
 * that actually go wrong in practice: variable missing, direct-instead-of-
 * pooled host, password placeholder left in, unreachable server, tables not
 * created yet.
 *
 * Never returns the password — only the shape of the URL around it.
 */
async function handle(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const required = process.env.SEED_TOKEN;
  const tokenOk = !!required && token === required;
  if (!tokenOk && !(await isAuthed())) {
    return NextResponse.json(
      { error: "Unauthorized. Log in at /admin, or add ?token=<SEED_TOKEN>." },
      { status: 401 }
    );
  }

  const info = describeConnection();
  const checks: Check[] = [];

  // 1 — is the variable there at all?
  checks.push({
    label: "DATABASE_URL is set",
    ok: info.configured,
    detail: info.configured
      ? "Found in the environment."
      : "Missing. Add it in Vercel → Settings → Environment Variables, then redeploy.",
  });

  if (!info.configured) {
    return NextResponse.json({ ok: false, checks, next: "Add DATABASE_URL and redeploy." });
  }

  // 2 — did it parse?
  checks.push({
    label: "Connection string is valid",
    ok: info.parsed,
    detail: info.parsed
      ? `Host ${info.host}, port ${info.port}, database ${info.database}.`
      : "Could not be parsed as a URL. It should start with postgresql:// and contain no spaces or line breaks.",
  });

  // 3 — password actually filled in?
  checks.push({
    label: "Password filled in",
    ok: info.hasPassword && !info.passwordLooksLikePlaceholder,
    detail: !info.hasPassword
      ? "No password in the URL. Replace [YOUR-PASSWORD] with your real database password."
      : info.passwordLooksLikePlaceholder
      ? "Still contains the placeholder text. Replace [YOUR-PASSWORD] (square brackets included) with the real password."
      : "Present.",
  });

  // 4 — pooled host? Vercel cannot reach Supabase's direct host.
  checks.push({
    label: "Using the pooled connection",
    ok: info.pooled,
    detail: info.pooled
      ? "Pooler host detected — correct for Vercel."
      : "This looks like a direct connection. Vercel cannot reach Supabase's direct host; copy the Transaction pooler URI instead (it contains 'pooler' and port 6543).",
  });

  // 5 — can we actually talk to it?
  let canConnect = false;
  let connectError = "";
  let tablesExist = false;
  let studentCount: number | null = null;

  if (sql) {
    try {
      await sql`SELECT 1`;
      canConnect = true;
    } catch (e) {
      connectError = String(e instanceof Error ? e.message : e);
    }
  }

  checks.push({
    label: "Server reachable",
    ok: canConnect,
    detail: canConnect
      ? "Connected successfully."
      : explainConnectError(connectError, info.pooled),
  });

  // 6 — tables created?
  if (canConnect && sql) {
    try {
      const [row] = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count FROM students
      `;
      tablesExist = true;
      studentCount = row?.count ?? 0;
    } catch {
      tablesExist = false;
    }
  }

  if (canConnect) {
    checks.push({
      label: "CRM tables created",
      ok: tablesExist,
      detail: tablesExist
        ? `Ready — ${studentCount} student record(s).`
        : "Not created yet. Open /api/seed once to create them.",
    });
  }

  const ok = checks.every((c) => c.ok);
  const firstProblem = checks.find((c) => !c.ok);

  return NextResponse.json({
    ok,
    checks,
    next: ok
      ? "Everything is connected. Open /admin/crm."
      : firstProblem?.detail ?? "See the failing check above.",
  });
}

function explainConnectError(msg: string, pooled: boolean): string {
  const m = msg.toLowerCase();
  if (m.includes("password authentication failed") || m.includes("sasl")) {
    return "Wrong password. Reset it in Supabase → Settings → Database, then update DATABASE_URL in Vercel.";
  }
  if (m.includes("enotfound") || m.includes("getaddrinfo")) {
    return "Host not found. Check the region part of the URL (e.g. aws-0-ap-south-1) matches your Supabase project's region.";
  }
  if (m.includes("econnrefused") || m.includes("timeout") || m.includes("etimedout")) {
    // Only blame the direct host when the URL is not already a pooler one.
    return pooled
      ? `Could not reach the server (${msg}). Check the project is not paused in Supabase, and that the region in the host matches your project.`
      : "Could not reach the server. This usually means the direct host was used instead of the pooler — use the Transaction pooler URI (port 6543).";
  }
  if (m.includes("tenant or user not found")) {
    return "Tenant not found. The project ref or region in the URL does not match your Supabase project.";
  }
  if (m.includes("unrecognized configuration parameter")) {
    return `The URL carries an option Postgres rejects (${msg}). Remove extra query parameters after the database name.`;
  }
  return msg || "Unknown error.";
}

export const GET = handle;
export const POST = handle;
