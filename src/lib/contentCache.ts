// ---------------------------------------------------------------------------
// The website content, cached between requests.
//
// The root layout reads this, and the root layout wraps EVERY page — the
// marketing site a customer lands on, the admin panel, the CRM. So a database
// round trip here was a database round trip on every single page view the site
// ever served, to fetch something that changes when the owner edits the site
// and at no other time.
//
// It is cached against a tag instead, and saving an edit clears that tag, so
// visitors get it without the round trip and the owner still sees a change
// immediately rather than waiting for a timer.
// ---------------------------------------------------------------------------

import { unstable_cache } from "next/cache";
import { defaultContent, SiteContent } from "./content";
import { readContent } from "./storage";

export const CONTENT_TAG = "site-content";

/**
 * The published content. The `revalidate` below is a backstop for the case
 * where a save happens somewhere that cannot clear the tag; the tag is what
 * normally does the work.
 */
export const getCachedContent = unstable_cache(
  async (): Promise<SiteContent> => (await readContent()) ?? defaultContent,
  ["site-content-v1"],
  { tags: [CONTENT_TAG], revalidate: 3600 }
);
