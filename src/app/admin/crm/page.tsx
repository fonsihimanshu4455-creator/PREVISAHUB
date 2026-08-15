// The student CRM, with its board rendered on the server.
//
// It used to open empty and then ask for the session, the students, the tasks
// and the counsellors in separate requests — four round trips before a row
// appeared, on the screen the office keeps open all day.

import CrmBoard from "@/components/crm/CrmBoard";
import { getSession } from "@/lib/authServer";
import { dbEnabled, listCounsellors, listStudents, listTasks, overview } from "@/lib/db";
import { listStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  // The layout puts the login screen up in this case.
  if (session.role === "none") return <CrmBoard />;

  const one = (k: string) => {
    const v = searchParams[k];
    return typeof v === "string" ? v : "";
  };
  const counsellor = session.role === "staff" ? session.staff.name : undefined;

  const [{ students, total }, tasks, counsellors, staff, counts] = await Promise.all([
    listStudents({
      counsellor,
      stage: one("stage"),
      country: one("country"),
      due: one("due"),
      test: one("test"),
      limit: 200,
    }),
    listTasks(),
    listCounsellors(),
    listStaff().catch(() => []),
    overview(counsellor),
  ]);

  return (
    <CrmBoard
      initial={{
        students,
        total,
        tasks,
        counsellors,
        telecallers: staff
          .filter((s) => s.role === "telecaller" && s.active)
          .map((s) => s.name),
        role: session.role,
        mode: dbEnabled ? "db" : "demo",
        overview: counts,
      }}
    />
  );
}
