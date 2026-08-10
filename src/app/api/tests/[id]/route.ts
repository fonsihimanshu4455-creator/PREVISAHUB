import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { deleteTest, testCounsellor } from "@/lib/academics";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (session.role === "staff") {
    const owner = await testCounsellor(params.id);
    if (!owner || owner.toLowerCase() !== session.staff.name.toLowerCase()) {
      return NextResponse.json(
        { error: "This test is not on one of your students." },
        { status: 403 }
      );
    }
  }
  const ok = await deleteTest(params.id);
  if (!ok) return NextResponse.json({ error: "Test not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
