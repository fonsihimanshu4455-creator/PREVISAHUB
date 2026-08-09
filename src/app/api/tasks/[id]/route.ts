import { NextResponse } from "next/server";
import { dbEnabled, setTaskDone } from "@/lib/db";
import { requireCrmAccess } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireCrmAccess())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const done = Boolean(body.done);
    if (!dbEnabled) {
      return NextResponse.json({ mode: "demo", task: { id: params.id, done } });
    }
    const task = await setTaskDone(params.id, done);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ mode: "db", task });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to update task", detail: String(e) },
      { status: 500 }
    );
  }
}
