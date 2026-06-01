"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-cream via-white to-orange-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-brand-navy/10 border border-slate-100 p-8">
        <h1 className="font-display text-2xl font-extrabold text-brand-navy text-center">
          Admin Login
        </h1>
        <p className="mt-2 text-sm text-slate-600 text-center">
          Enter the admin password to manage site content.
        </p>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await loginAction(formData);
              if (result?.error) setError(result.error);
            });
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 outline-none transition"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <a
          href="/"
          className="mt-6 block text-center text-sm text-slate-500 hover:text-brand-orange"
        >
          ← Back to website
        </a>
      </div>
    </main>
  );
}
