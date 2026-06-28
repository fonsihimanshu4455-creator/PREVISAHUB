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
  STORAGE_KEY,
} from "./content";

// Deep-merge stored content over defaults so newly added fields always exist.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function mergeDefaults<T>(base: T, stored: unknown): T {
  if (!isPlainObject(base)) {
    return (stored === undefined ? base : (stored as T));
  }
  if (!isPlainObject(stored)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base as Record<string, unknown>)) {
    out[key] = mergeDefaults(
      (base as Record<string, unknown>)[key],
      stored[key]
    );
  }
  return out as T;
}

type Ctx = {
  content: SiteContent;
  ready: boolean;
  save: (next: SiteContent) => void;
  reset: () => void;
  exportJson: () => string;
  importJson: (json: string) => boolean;
};

const SiteContentContext = createContext<Ctx | null>(null);

export function SiteContentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [ready, setReady] = useState(false);

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setContent(mergeDefaults(defaultContent, parsed));
      }
    } catch {
      // corrupt data — fall back to defaults
    }
    setReady(true);
  }, []);

  // Reflect saved changes across tabs/pages live.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setContent(mergeDefaults(defaultContent, JSON.parse(e.newValue)));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: SiteContent) => {
    setContent(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      // Most likely the localStorage quota was exceeded by large images.
      alert(
        "Could not save — storage is full. Try using smaller images (under ~500 KB each)."
      );
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setContent(defaultContent);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const exportJson = useCallback(
    () => JSON.stringify(content, null, 2),
    [content]
  );

  const importJson = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json);
        const merged = mergeDefaults(defaultContent, parsed);
        save(merged);
        return true;
      } catch {
        return false;
      }
    },
    [save]
  );

  return (
    <SiteContentContext.Provider
      value={{ content, ready, save, reset, exportJson, importJson }}
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

// Convenience read-only hook for public site components.
export function useContent(): SiteContent {
  return useSiteContent().content;
}
