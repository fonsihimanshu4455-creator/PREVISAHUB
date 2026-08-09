import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { deletePayment, paymentCounsellor } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (session.role === "staff") {
    const owner = await paymentCounsellor(params.id);
    if (!owner || owner.toLowerCase() !== session.staff.name.toLowerCase()) {
      return NextResponse.json(
        { error: "This payment is not on one of your students." },
        { status: 403 }
      );
    }
  }

  const ok = await deletePayment(params.id);
  if (!ok) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
