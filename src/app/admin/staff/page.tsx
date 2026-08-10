"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
  username: string;
  role: "counsellor" | "telecaller";
  active: boolean;
  createdAt: string;
};

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [resetting, setResetting] = useState<Staff | null>(null);

  async function load() {
    setLoading(true);
    try {
      const d = await fetch("/api/staff").then((r) => r.json());
      if (d.staff) setStaff(d.staff);
      else setError(d.detail || d.error || "Could not load staff.");
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(s: Staff) {
    await fetch(`/api/staff/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    load();
  }

  async function changeRole(s: Staff, role: string) {
    await fetch(`/api/staff/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function remove(s: Staff) {
    if (!confirm(`Remove ${s.name}? They will not be able to log in again.`)) return;
    await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Staff Accounts 👥
          </h1>
          <p className="mt-1 text-slate-500">
            Each counsellor gets their own login. They only see the students
            assigned to them, and cannot edit the website.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          + Add Staff
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Staff sign in at{" "}
        <a
          href="/staff"
          target="_blank"
          className="font-semibold text-orange-600 hover:underline"
        >
          /staff
        </a>
        . A student shows up for whoever is set as their <b>Counsellor</b> in the
        CRM — so the staff member&apos;s name here must match the counsellor name
        on the student.
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {s.username}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.role}
                      onChange={(e) => changeRole(s, e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold outline-none focus:border-orange-400"
                    >
                      <option value="counsellor">Counsellor</option>
                      <option value="telecaller">Telecaller</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                        s.active
                          ? "bg-green-100 text-green-700 ring-green-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {s.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => setResetting(s)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-orange-400 hover:text-orange-600"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => toggleActive(s)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        {s.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => remove(s)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    No staff accounts yet — add your first counsellor above.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddStaffModal
          onClose={() => setShowAdd(false)}
          onDone={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordModal staff={resetting} onClose={() => setResetting(null)} />
      )}
    </div>
  );
}

function AddStaffModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("counsellor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password, role }),
    });
    const d = await res.json();
    setBusy(false);
    if (d.staff) onDone();
    else setError(d.error || "Could not create the account.");
  }

  return (
    <Modal title="Add Staff Member" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Role" hint="Counsellors work the CRM; telecallers get a calling list.">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          >
            <option value="counsellor">Counsellor</option>
            <option value="telecaller">Telecaller</option>
          </select>
        </Field>
        <Field
          label="Full name"
          hint={
            role === "telecaller"
              ? "Numbers you assign to this name show on their calling list."
              : "Must match the Counsellor name on their students."
          }
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Neha Gupta"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </Field>
        <Field label="Username" hint="What they type to log in. Lowercase, no spaces.">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. neha"
            autoCapitalize="none"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </Field>
        <Field label="Password" hint="At least 6 characters. Share it with them privately.">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy || !name || !username || !password}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  staff,
  onClose,
}: {
  staff: Staff;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/staff/${staff.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const d = await res.json();
    setBusy(false);
    setMsg(
      d.ok
        ? "Password changed. They will need to log in again."
        : d.error || "Could not change the password."
    );
  }

  return (
    <Modal title={`Reset password · ${staff.name}`} onClose={onClose}>
      <Field label="New password" hint="At least 6 characters.">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
        />
      </Field>
      {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
        <button
          onClick={save}
          disabled={busy || password.length < 6}
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Set password"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
