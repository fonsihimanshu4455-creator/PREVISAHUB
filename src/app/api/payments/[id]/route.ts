import { NextResponse } from "next/server";
import { denyMoneyAccess } from "@/lib/authServer";
import { deletePayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Owner only — see denyMoneyAccess.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await denyMoneyAccess();
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const ok = await deletePayment(params.id);
  if (!ok) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
