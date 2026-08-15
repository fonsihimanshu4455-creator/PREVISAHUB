// ---------------------------------------------------------------------------
// Who is using the tele-sales CRM, and what they may do.
//
// The old portals (/staff, /calling) keep their own two-role model; this adds
// a `crm_role` alongside it so widening the sales roles cannot change who can
// log into what already exists. The owner's admin cookie is always `admin`.
//
// Every API route in this module starts by calling `crmSession()` and then
// `can()` — permission checks live on the server, never in the navigation.
// ---------------------------------------------------------------------------

import { sql } from "../db";
import { getSession } from "../authServer";
import { ensureStaffSchema } from "../staff";
import { can, CRM_ROLES, CrmRole, Permission } from "./types";

export type CrmUser = {
  name: string;
  role: CrmRole;
  /** Blank for roles that see everything; the person's own name otherwise. */
  scope: string;
};

/**
 * The crm_role column is created with the rest of the staff table, so this is
 * just that guard under a name the CRM's own code reads better with.
 */
export const ensureCrmRoles = ensureStaffSchema;

export async function crmSession(): Promise<CrmUser | null> {
  const s = await getSession();
  if (s.role === "admin") return { name: "Owner", role: "admin", scope: "" };
  if (s.role !== "staff") return null;

  await ensureCrmRoles();
  let role: CrmRole = "sales_executive";
  if (sql) {
    const [row] = await sql<{ crm_role: string }[]>`
      SELECT crm_role FROM staff WHERE id = ${s.staff.id}
    `;
    if (row && (CRM_ROLES as readonly string[]).includes(row.crm_role)) {
      role = row.crm_role as CrmRole;
    }
  }
  return {
    name: s.staff.name,
    role,
    // Anyone without leads:all works only their own book, and every query in
    // this module narrows on `scope`.
    scope: can(role, "leads:all") ? "" : s.staff.name,
  };
}

/**
 * Guard for an API route: returns the user, or the response to send instead.
 * Callers write `const g = await guard("money:view"); if ("status" in g) …`.
 */
export async function guard(
  perm?: Permission
): Promise<CrmUser | { status: number; error: string }> {
  const user = await crmSession();
  if (!user) return { status: 401, error: "Please log in." };
  if (perm && !can(user.role, perm)) {
    return { status: 403, error: "Your role does not have access to this." };
  }
  return user;
}

export async function setCrmRole(staffId: string, role: CrmRole): Promise<boolean> {
  if (!sql) return false;
  await ensureCrmRoles();
  const rows = await sql<{ id: string }[]>`
    UPDATE staff SET crm_role = ${role} WHERE id = ${staffId} RETURNING id
  `;
  return rows.length > 0;
}

/** Staff who can own a lead, for the assignment dropdowns. */
export async function assignableUsers(): Promise<
  { id: string; name: string; role: CrmRole }[]
> {
  if (!sql) return [];
  await ensureCrmRoles();
  const rows = await sql<{ id: string; name: string; crm_role: string }[]>`
    SELECT id, name, crm_role FROM staff WHERE active ORDER BY name
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: ((CRM_ROLES as readonly string[]).includes(r.crm_role)
      ? r.crm_role
      : "sales_executive") as CrmRole,
  }));
}
