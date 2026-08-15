import { Suspense } from "react";
import Shell from "@/components/salescrm/Shell";

export const metadata = {
  title: "Sales CRM · Pre Visa Hub",
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-sunk text-[color:var(--text-faint)]">
          Loading…
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
