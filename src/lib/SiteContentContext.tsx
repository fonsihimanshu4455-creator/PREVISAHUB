"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  SiteContent,
  defaultContent,
  mergeDefaults,
  STORAGE_KEY,
} from "./content";

type Ctx = {
  content: SiteContent;
  ready: boolean;
  storage: boolean; // true when a server database is connected
  save: (next: SiteContent) => Promise<boolean>;
  reset: () => void;
  exportJson: () => string;
  importJson: (json: string) => Promise<boolean>;
};

const SiteContentContext = createContext<Ctx | null>(null);

export function SiteContentProvider({
  initial,
  children,
}: {
  initial?: SiteContent;
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<SiteContent>(initial ?? defaultContent);
  // `ready` flips true only after the client has refreshed from the server, so
  // the admin always edits the freshest content (public pages use the SSR seed
  // and never gate on this).
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState(false);

  // Load the latest content from the server. Fall back to localStorage when no
  // database is connected (so local edits still work per-browser).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setStorage(Boolean(data.storage));
            if (data.storage) {
              setContent(mergeDefaults(defaultContent, data.content));
            } else {
              // No DB → use this browser's saved copy if present.
              const raw = localStorage.getItem(STORAGE_KEY);
              setContent(
                raw
                  ? mergeDefaults(defaultContent, JSON.parse(raw))
                  : mergeDefaults(defaultContent, data.content)
              );
            }
          }
        }
      } catch {
        // Offline / API unavailable → localStorage fallback.
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && !cancelled) {
            setContent(mergeDefaults(defaultContent, JSON.parse(raw)));
          }
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (next: SiteContent): Promise<boolean> => {
      setContent(next);
      if (storage) {
        try {
          const res = await fetch("/api/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: next }),
          });
          if (res.status === 401) {
            alert("Your session expired. Please log in again.");
            return false;
          }
          if (!res.ok) {
            alert("Could not save to the server. Please try again.");
            return false;
          }
          return true;
        } catch {
          alert("Network error while saving. Please try again.");
          return false;
        }
      }
      // No database → save to this browser only.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return true;
      } catch {
        alert("Could not save — storage full. Use smaller images.");
        return false;
      }
    },
    [storage]
  );

  const reset = useCallback(() => {
    setContent(defaultContent);
    void save(defaultContent);
  }, [save]);

  const exportJson = useCallback(
    () => JSON.stringify(content, null, 2),
    [content]
  );

  const importJson = useCallback(
    async (json: string) => {
      try {
        const parsed = JSON.parse(json);
        const merged = mergeDefaults(defaultContent, parsed);
        return await save(merged);
      } catch {
        return false;
      }
    },
    [save]
  );

  return (
    <SiteContentContext.Provider
      value={{ content, ready, storage, save, reset, exportJson, importJson }}
    >
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx) {
    throw new Error("useSiteContent must be used within SiteContentProvider");
  }
  return ctx;
}

export function useContent(): SiteContent {
  return useSiteContent().content;
}
