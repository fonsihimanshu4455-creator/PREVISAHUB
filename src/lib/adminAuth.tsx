"use client";

import { useCallback, useEffect, useState } from "react";

// Server-backed admin auth. Login sets an httpOnly session cookie, so the admin
// can log in from any device/browser. Works even before a database is connected
// (password falls back to the ADMIN_PASSWORD env var or the built-in default).
export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setAuthed(Boolean(data.authed));
            setStorage(Boolean(data.storage));
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Returns "" on success, or the reason the login failed — which is not
  // always "wrong password", and the owner cannot guess which it was.
  const login = useCallback(async (password: string): Promise<string> => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
        return "";
      }
      const body = await res.json().catch(() => null);
      return body?.error || "Wrong password. Try again.";
    } catch {
      return "Could not reach the server. Check your connection and try again.";
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setAuthed(false);
  }, []);

  // Returns: "ok" | "no-storage" | "error"
  const changePassword = useCallback(
    async (next: string): Promise<"ok" | "no-storage" | "error"> => {
      try {
        const res = await fetch("/api/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: next }),
        });
        if (res.ok) return "ok";
        if (res.status === 503) return "no-storage";
        return "error";
      } catch {
        return "error";
      }
    },
    []
  );

  return { authed, ready, storage, login, logout, changePassword };
}
