"use client";

import { useState } from "react";
import Icon from "@/components/admin/Icon";


export default function LoginScreen({
  onLogin,
}: {
  /** Resolves to "" on success, or the reason it failed. */
  onLogin: (password: string) => Promise<string>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setError(await onLogin(password));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-2xl"
      >
        <div className="text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon name="logo" className="h-5 w-5" strokeWidth={2} /></span>
          <h1 className="mt-3 font-display text-xl font-bold text-[color:var(--text)]">
            Pre Visa Hub Admin
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Enter your password to continue</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Password"
          className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
        />
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-[13.5px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Logging in…" : "Login"}
        </button>
        <p className="mt-5 text-center text-xs text-[color:var(--text-faint)]">
          Counsellor?{" "}
          <a href="/staff" className="font-semibold text-accent hover:underline">
            Staff portal
          </a>
          {" · "}
          Telecaller?{" "}
          <a href="/calling" className="font-semibold text-accent hover:underline">
            Calling panel
          </a>
        </p>
      </form>
    </div>
  );
}
