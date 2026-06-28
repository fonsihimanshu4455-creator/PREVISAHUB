"use client";

import { useCallback, useEffect, useState } from "react";
import { useSiteContent } from "./SiteContentContext";
import { SiteContent } from "./content";

// Editing helper for one top-level content section.
// Keeps a local draft, exposes setDraft, and commits the draft to storage.
export function useAdminSection<K extends keyof SiteContent>(key: K) {
  const { content, save, ready } = useSiteContent();
  const [draft, setDraft] = useState<SiteContent[K]>(content[key]);
  const [initialized, setInitialized] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    if (ready && !initialized) {
      setDraft(content[key]);
      setInitialized(true);
    }
  }, [ready, initialized, content, key]);

  const commit = useCallback(() => {
    save({ ...content, [key]: draft });
    setSavedAt(Date.now());
  }, [content, key, draft, save]);

  // Shallow patch helper for object sections.
  const patch = useCallback(
    (partial: Partial<SiteContent[K]>) =>
      setDraft((d) => ({ ...d, ...partial })),
    []
  );

  return { draft, setDraft, patch, commit, ready: ready && initialized, savedAt };
}
