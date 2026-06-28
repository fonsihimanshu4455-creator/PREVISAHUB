"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_KEY, PASSWORD_KEY, DEFAULT_PASSWORD } from "./content";

// Lightweight, client-side admin gate. This is NOT real security — it only
// keeps casual visitors out of the editor. The whole site is static, so the
// password lives in the browser. Treat the admin URL as private.
export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(AUTH_KEY) === "1");
    setReady(true);
  }, []);

  const currentPassword = useCallback(() => {
    return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
  }, []);

  const login = useCallback(
    (password: string) => {
      if (password === currentPassword()) {
        localStorage.setItem(AUTH_KEY, "1");
        setAuthed(true);
        return true;
      }
      return false;
    },
    [currentPassword]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  }, []);

  const changePassword = useCallback((next: string) => {
    localStorage.setItem(PASSWORD_KEY, next);
  }, []);

  return { authed, ready, login, logout, changePassword };
}
