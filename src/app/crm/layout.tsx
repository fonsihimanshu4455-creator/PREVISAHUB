import { Suspense } from "react";
import Shell, { type CrmMe } from "@/components/salescrm/Shell";
import { assignableUsers, crmSession } from "@/lib/leads/auth";
import { can, ROLE_LABELS } from "@/lib/leads/types";

export const metadata = { title: "Sales CRM · Pre Visa Hub" };
export const dynamic = "force-dynamic";

/**
 * The session is resolved here, on the server, and handed to the shell as a
 * prop.
 *
 * It used to be fetched from the browser, which made every page load two
 * round trips deep before anything appeared: download the app, ask who am I,
 * and only once that came back could the page start fetching what it actually
 * came for. Now the HTML arrives with the answer already in it and the page's
 * own request is the first thing that goes out.
 */
export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await crmSession();

  const initial: CrmMe | null = user
    ? {
        user: { ...user, label: ROLE_LABELS[user.role] },
        permissions: {
          seesEveryone: can(user.role, "leads:all"),
          canEdit: can(user.role, "leads:edit"),
          canAssign: can(user.role, "leads:assign"),
          canDelete: can(user.role, "leads:delete"),
          canCall: can(user.role, "calls:log"),
          canBook: can(user.role, "appointments:manage"),
          seesMoney: can(user.role, "money:view"),
          editsMoney: can(user.role, "money:edit"),
          seesReports: can(user.role, "reports:view"),
          managesStaff: can(user.role, "employees:manage"),
        },
        team: can(user.role, "leads:assign") ? await assignableUsers() : [],
      }
    : null;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-sunk text-[color:var(--text-faint)]">
          Loading…
        </div>
      }
    >
      <Shell initial={initial}>{children}</Shell>
    </Suspense>
  );
}
