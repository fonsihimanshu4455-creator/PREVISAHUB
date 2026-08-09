// ============================================================================
// Server-side storage (database) helpers.
// ----------------------------------------------------------------------------
// Talks to an Upstash-compatible Redis over its REST API. This is what both
// Vercel KV and the Vercel Marketplace "Upstash" integration provide, and the
// env vars they auto-inject are read below. No npm dependency required.
//
// If no database is connected, storageConfigured() is false and the app
// gracefully falls back to per-browser localStorage.
// ============================================================================

import {
  defaultContent,
  mergeDefaults,
  SiteContent,
  KV_CONTENT_KEY,
  KV_PASSWORD_KEY,
  DEFAULT_PASSWORD,
} from "./content";

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function storageConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

async function redis(command: string[]): Promise<unknown> {
  if (!storageConfigured()) return null;
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Storage error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}

// ---- Content -------------------------------------------------------------
export async function readContent(): Promise<SiteContent | null> {
  if (!storageConfigured()) return null;
  try {
    const raw = (await redis(["GET", KV_CONTENT_KEY])) as string | null;
    if (!raw) return null;
    return mergeDefaults(defaultContent, JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeContent(content: SiteContent): Promise<void> {
  await redis(["SET", KV_CONTENT_KEY, JSON.stringify(content)]);
}

// ---- Password ------------------------------------------------------------
export async function getAdminPassword(): Promise<string> {
  if (storageConfigured()) {
    try {
      const stored = (await redis(["GET", KV_PASSWORD_KEY])) as string | null;
      if (stored) return stored;
    } catch {
      /* fall through */
    }
  }
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

export async function setAdminPassword(password: string): Promise<boolean> {
  if (!storageConfigured()) return false;
  await redis(["SET", KV_PASSWORD_KEY, password]);
  return true;
}
