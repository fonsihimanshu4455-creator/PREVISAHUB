import { sql } from "@vercel/postgres";
import {
  defaultContent,
  type SiteContent,
  type Hero,
  type Service,
  type Country,
  type About,
  type Contact,
} from "./content-types";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS site_content (
      section TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  schemaReady = true;
}

function isPostgresConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

async function readSection<T>(section: keyof SiteContent, fallback: T): Promise<T> {
  if (!isPostgresConfigured()) return fallback;
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT data FROM site_content WHERE section = ${section}`;
    if (rows.length === 0) return fallback;
    return rows[0].data as T;
  } catch {
    return fallback;
  }
}

async function writeSection(section: keyof SiteContent, data: unknown) {
  if (!isPostgresConfigured()) {
    throw new Error("Database is not configured. Set POSTGRES_URL in your environment.");
  }
  await ensureSchema();
  await sql`
    INSERT INTO site_content (section, data, updated_at)
    VALUES (${section}, ${JSON.stringify(data)}::jsonb, NOW())
    ON CONFLICT (section) DO UPDATE
    SET data = EXCLUDED.data, updated_at = NOW();
  `;
}

export async function getHero(): Promise<Hero> {
  return readSection("hero", defaultContent.hero);
}
export async function getServices(): Promise<Service[]> {
  return readSection("services", defaultContent.services);
}
export async function getCountries(): Promise<Country[]> {
  return readSection("countries", defaultContent.countries);
}
export async function getAbout(): Promise<About> {
  return readSection("about", defaultContent.about);
}
export async function getContact(): Promise<Contact> {
  return readSection("contact", defaultContent.contact);
}

export async function saveHero(data: Hero) {
  await writeSection("hero", data);
}
export async function saveServices(data: Service[]) {
  await writeSection("services", data);
}
export async function saveCountries(data: Country[]) {
  await writeSection("countries", data);
}
export async function saveAbout(data: About) {
  await writeSection("about", data);
}
export async function saveContact(data: Contact) {
  await writeSection("contact", data);
}

export async function getAllContent(): Promise<SiteContent> {
  const [hero, services, countries, about, contact] = await Promise.all([
    getHero(),
    getServices(),
    getCountries(),
    getAbout(),
    getContact(),
  ]);
  return { hero, services, countries, about, contact };
}
