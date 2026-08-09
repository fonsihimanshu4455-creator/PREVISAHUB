import { NextResponse } from "next/server";
import { dbEnabled, listTasks } from "@/lib/db";
import { requireCrmAccess } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireCrmAccess())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const tasks = await listTasks();
    return NextResponse.json({ mode: dbEnabled ? "db" : "demo", tasks });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load tasks", detail: String(e) },
      { status: 500 }
    );
  }
}
