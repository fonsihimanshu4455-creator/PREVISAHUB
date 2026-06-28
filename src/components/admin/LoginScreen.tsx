"use client";

import { useState } from "react";
import { DEFAULT_PASSWORD } from "@/lib/content";

export default function LoginScreen({
  onLogin,
}: {
  onLogin: (password: string) => boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogin(password)) {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="text-center">
          <div className="text-4xl">🔶</div>
          <h1 className="mt-3 font-display text-xl font-bold text-slate-800">
            Pre Visa Hub Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">Enter your password to continue</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Password"
          className="mt-6 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
        />
        {error && (
          <p className="mt-2 text-sm text-red-500">Wrong password. Try again.</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition"
        >
          Login
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          Default password: <span className="font-mono">{DEFAULT_PASSWORD}</span>
          <br />
          You can change it in Global Settings.
        </p>
      </form>
    </div>
  );
}
