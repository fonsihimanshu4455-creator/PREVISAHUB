"use client";

// The team scoreboard, and — for the owner — the role each account holds in
// the sales CRM. Changing a role here changes what that person can reach.

import { useCallback, useEffect, useState } from "react";
import { useCrm } from "@/components/salescrm/Shell";
import { formatINRShort } from "@/components/salescrm/ui";
import { CRM_ROLES, CrmRole, ROLE_LABELS } from "@/lib/leads/types";
import type { EmployeeRow } from "@/lib/leads/stats";

export default function TeamPage() {
  const { permissions, team } = useCrm();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [roles, setRoles] = useState<Record<string, CrmRole>>({});
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/crm/stats").then((x) => x.json());
    setRows(r?.charts?.employees ?? []);
    const s = await fetch("/api/crm/session").then((x) => x.json());
    const map: Record<string, CrmRole> = {};
    for (const t of s.team ?? []) map[t.id] = t.role;
    setRoles(map);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(id: string, role: CrmRole) {
    setRoles((p) => ({ ...p, [id]: role }));
    const r = await fetch("/api/crm/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    }).then((x) => x.json());
    setMsg(r.error ?? "Role updated.");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">People</p>
        <h1 className="mt-1 font-display text-display-lg font-bold">Team</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--text-muted)]">
          Who is working, and what each of them is doing.
        </p>
      </div>

      {msg && (
        <p className="rounded-lg bg-surface-sunk px-3 py-2 text-[13px] text-[color:var(--text-muted)]">
          {msg}
        </p>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-[13px]">
            <thead>
              <tr>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-3 py-2.5 text-right">Leads</th>
                <th className="px-3 py-2.5 text-right">Calls</th>
                <th className="px-3 py-2.5 text-right">Connected</th>
                <th className="px-3 py-2.5 text-right">Qualified</th>
                <th className="px-3 py-2.5 text-right">Appts</th>
                <th className="px-3 py-2.5 text-right">Won</th>
                <th className="px-3 py-2.5 text-right">Conv %</th>
                <th className="px-3 py-2.5 text-right">Missed</th>
                {permissions.seesMoney && <th className="px-3 py-2.5 text-right">Sales</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.name}>
                  <td className="px-4 py-2.5 font-medium">{e.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{e.leads}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{e.calls}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{e.connected}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{e.qualified}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{e.appointments}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{e.converted}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{e.conversionRate}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[color:var(--crit)]">
                    {e.missedFollowUps}
                  </td>
                  {permissions.seesMoney && (
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatINRShort(e.sales)}</td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[color:var(--text-faint)]">
                    Nobody has leads assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {permissions.managesStaff && (
        <div className="panel p-4">
          <h2 className="font-display text-[14px] font-bold">CRM roles</h2>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--text-muted)]">
            A role decides what the person can reach. Sales executives see only
            their own leads and never see money.
          </p>
          <div className="mt-3 divide-y divide-line">
            {team.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="text-[13.5px] font-semibold">{t.name}</div>
                  <div className="text-[11.5px] text-[color:var(--text-faint)]">
                    {ROLE_LABELS[roles[t.id] ?? t.role]}
                  </div>
                </div>
                <select
                  value={roles[t.id] ?? t.role}
                  onChange={(e) => changeRole(t.id, e.target.value as CrmRole)}
                  className="rounded-xl border border-line-strong bg-surface-sunk px-3 py-1.5 text-[12.5px]"
                >
                  {CRM_ROLES.filter((r) => r !== "admin").map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {team.length === 0 && (
              <p className="py-4 text-[13px] text-[color:var(--text-faint)]">
                No staff accounts yet — add them in the admin panel under Staff
                Accounts.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
