import { NextResponse } from "next/server";
import { denyMoneyAccess } from "@/lib/authServer";
import { addPayment, listPayments, PAYMENT_METHODS, PAYMENT_PURPOSES, setStudentFee } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Reading and recording money is owner only — see denyMoneyAccess.
export async function GET() {
  const denied = await denyMoneyAccess();
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }
  try {
    const payments = await listPayments();
    return NextResponse.json({ role: "admin", payments });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load payments", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const denied = await denyMoneyAccess();
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }
  try {
    const body = await req.json();
    const studentId = String(body.studentId ?? "");
    if (!studentId) {
      return NextResponse.json({ error: "Pick a student first." }, { status: 400 });
    }

    // Setting the agreed fee comes through the same endpoint.
    if (body.totalFee !== undefined) {
      const fee = Number(body.totalFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return NextResponse.json({ error: "Enter a valid fee amount." }, { status: 400 });
      }
      await setStudentFee(studentId, fee);
      return NextResponse.json({ ok: true });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter an amount greater than zero." }, { status: 400 });
    }
    const method = PAYMENT_METHODS.includes(body.method) ? body.method : "Cash";
    const purpose = PAYMENT_PURPOSES.includes(body.purpose) ? body.purpose : "Application";
    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(String(body.paidOn ?? ""))
      ? String(body.paidOn)
      : new Date().toISOString().slice(0, 10);

    const payment = await addPayment({
      studentId, amount, method, purpose, paidOn, note: String(body.note ?? ""),
    });
    if (!payment) {
      return NextResponse.json({ error: "No database connected." }, { status: 503 });
    }
    return NextResponse.json({ payment });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to record payment", detail: String(e) },
      { status: 500 }
    );
  }
}
