import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/authServer";
import { addPayment, listPayments, PAYMENT_METHODS, PAYMENT_PURPOSES, setStudentFee } from "@/lib/payments";
import { studentBelongsTo } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const payments = await listPayments(
      session.role === "staff" ? session.staff.name : undefined
    );
    return NextResponse.json({ role: session.role, payments });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load payments", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await requireCrmAccess();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const studentId = String(body.studentId ?? "");
    if (!studentId) {
      return NextResponse.json({ error: "Pick a student first." }, { status: 400 });
    }
    if (
      session.role === "staff" &&
      !(await studentBelongsTo(studentId, session.staff.name))
    ) {
      return NextResponse.json(
        { error: "This student is not assigned to you." },
        { status: 403 }
      );
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
