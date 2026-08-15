// Whether the owner is signed in is resolved here, on the server, and handed
// to the shell.
//
// It used to be asked for from the browser, so every admin page — the CRM, the
// sales screen, every editor — spent a round trip finding out something the
// request already carried in its cookie, before it could show anything.

import { Suspense } from "react";
import { isAuthed } from "@/lib/authServer";
import { storageConfigured } from "@/lib/storage";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = { authed: await isAuthed(), storage: storageConfigured() };
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ground text-[color:var(--text-faint)]">
          Loading…
        </div>
      }
    >
      <AdminShell initial={initial}>{children}</AdminShell>
    </Suspense>
  );
}
