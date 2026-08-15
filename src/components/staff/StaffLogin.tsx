"use client";

import { useState } from "react";
import Icon, { IconName } from "@/components/admin/Icon";

export type StaffAccount = {
  id: string;
  name: string;
  username: string;
  role?: string;
};

/**
 * Sign-in form shared by the staff panels. `expect` names the role this page
 * is for — the server rejects an account of the other kind and says where it
 * belongs, so nobody lands in a panel with nothing to show. Leave it off on a
 * page every account may use, like the sales CRM.
 */
export default function StaffLogin({
  expect,
  title,
  subtitle,
  icon = "logo",
  otherLabel,
  otherHref,
  onLogin,
}: {
  expect?: "counsellor" | "telecaller";
  title: string;
  subtitle: string;
  icon?: IconName;
  otherLabel: string;
  otherHref: string;
  onLogin: (s: StaffAccount) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [redirect, setRedirect] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setRedirect("");
    try {
      const res = await fetch("/api/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, expect }),
      });
      const data = await res.json();
      if (data.ok) onLogin(data.staff);
      else {
        setError(data.error || "Wrong username or password.");
        if (data.redirect) setRedirect(data.redirect);
      }
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm panel p-6"
      >
        <div className="mb-5 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon name={icon} className="h-5 w-5" strokeWidth={2} /></span>
          <h1 className="mt-2 font-display text-xl font-bold text-[color:var(--text)]">{title}</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">{subtitle}</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="your username"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-[color:var(--text-muted)]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>

        {error && (
          <p className="mt-2 text-sm text-red-500">
            {error}
            {redirect && (
              <>
                {" "}
                <a href={redirect} className="font-semibold underline">
                  Go there
                </a>
              </>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Login"}
        </button>

        <p className="mt-5 text-center text-xs text-[color:var(--text-faint)]">
          {otherLabel}{" "}
          <a href={otherHref} className="font-semibold text-accent hover:underline">
            Sign in here
          </a>
        </p>
      </form>
    </div>
  );
}
