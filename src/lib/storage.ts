// ============================================================================
// Server-side storage for site content and the admin password.
// ----------------------------------------------------------------------------
// Two backends, tried in order:
//
//   1. Upstash-compatible Redis over REST — what Vercel KV and the Vercel
//      Marketplace "Upstash" integration provide, read from the env vars they
//      auto-inject. No npm dependency required.
//   2. The Postgres database already configured for the CRM (DATABASE_URL).
//
// Postgres is the fallback so a working install needs one database rather than
// two: connect DATABASE_URL and website editing, the admin password and the
// CRM all persist together.
//
// With neither configured, storageConfigured() is false and the admin panel
// falls back to per-browser localStorage — edits stay on that one device.
// ============================================================================

import {
  defaultContent,
  mergeDefaults,
  SiteContent,
  KV_CONTENT_KEY,
  KV_PASSWORD_KEY,
  DEFAULT_PASSWORD,
} from "./content";
import { dbEnabled, settingGet, settingSet } from "./db";

const REST_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

function redisConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

/** Is there anywhere to persist edits server-side? */
export function storageConfigured(): boolean {
  return redisConfigured() || dbEnabled;
}

/** Which backend is actually in use — surfaced in the admin UI. */
export function storageBackend(): "redis" | "postgres" | "none" {
  if (redisConfigured()) return "redis";
  if (dbEnabled) return "postgres";
  return "none";
}

async function redis(command: string[]): Promise<unknown> {
  if (!redisConfigured()) return null;
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

async function get(key: string): Promise<string | null> {
  if (redisConfigured()) return (await redis(["GET", key])) as string | null;
  if (dbEnabled) return settingGet(key);
  return null;
}

async function set(key: string, value: string): Promise<void> {
  if (redisConfigured()) {
    await redis(["SET", key, value]);
    return;
  }
  if (dbEnabled) {
    await settingSet(key, value);
    return;
  }
  throw new Error("No storage configured.");
}

// ---- Content -------------------------------------------------------------
/**
 * Never let a slow or unreachable database hang a page render — fall back to
 * the built-in defaults instead. Rendering the site is more important than
 * rendering the very latest edit.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function readContent(): Promise<SiteContent | null> {
  if (!storageConfigured()) return null;
  try {
    const raw = await withTimeout(get(KV_CONTENT_KEY), 5000);
    if (!raw) return null;
    return mergeDefaults(defaultContent, JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeContent(content: SiteContent): Promise<void> {
  await set(KV_CONTENT_KEY, JSON.stringify(content));
}

// ---- Password ------------------------------------------------------------
// Every authenticated request checks the cookie against this password, so
// reading it from storage each time put a database round trip in front of
// literally every page and API call. It changes about once a year, so it is
// held briefly in memory instead.
//
// The cost of the cache is that changing the password can take up to
// PASSWORD_TTL to lock out sessions held on *other* server instances; the
// instance that made the change drops its own copy immediately.
const PASSWORD_TTL = 30_000;
let passwordCache: { value: string; at: number } | null = null;

export type PasswordSource =
  /** The password the owner set, read from the database. */
  | "stored"
  /** No password saved yet — the ADMIN_PASSWORD env var or the setup default. */
  | "setup"
  /** Storage is configured but unreachable, so the saved password is unknown. */
  | "unreachable";

export type AdminPassword = {
  value: string;
  source: PasswordSource;
  error?: string;
};

/**
 * The password the login screen must match.
 *
 * The failure case matters more than the happy one. When storage is
 * configured but the read fails — the usual cause being a rotated database
 * password that was never updated in the deployment — this falls back to the
 * setup password so the owner is not locked out of a fresh install. That
 * fallback is deliberately NOT cached and is reported as `unreachable`,
 * because a cached fallback would mean the setup password is quietly accepted
 * for the next thirty seconds while the real one is refused. That is both a
 * hole and the most confusing possible symptom.
 */
export async function readAdminPassword(): Promise<AdminPassword> {
  if (passwordCache && Date.now() - passwordCache.at < PASSWORD_TTL) {
    return { value: passwordCache.value, source: "stored" };
  }
  const setup = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  if (!storageConfigured()) return { value: setup, source: "setup" };

  try {
    const stored = await get(KV_PASSWORD_KEY);
    if (stored) {
      passwordCache = { value: stored, at: Date.now() };
      return { value: stored, source: "stored" };
    }
    // Read fine, nothing saved yet: still the setup password, and safe to
    // cache — it is a real answer, not a guess made after a failure.
    passwordCache = { value: setup, at: Date.now() };
    return { value: setup, source: "setup" };
  } catch (e) {
    return { value: setup, source: "unreachable", error: String(e) };
  }
}

export async function getAdminPassword(): Promise<string> {
  return (await readAdminPassword()).value;
}

export async function setAdminPassword(password: string): Promise<boolean> {
  if (!storageConfigured()) return false;
  await set(KV_PASSWORD_KEY, password);
  passwordCache = { value: password, at: Date.now() };
  return true;
}
