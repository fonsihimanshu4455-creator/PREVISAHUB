import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// A ready-to-fill CSV so people start from the right column names.
export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = [
    "Name,Phone,Email,City,Country,Intake,Counsellor,Stage,Test,Score,Target,Fee,Notes",
    "Simran Kaur,+91 98765 43210,simran@gmail.com,Ludhiana,Canada,Jan 2027,Neha Gupta,Documentation,IELTS,7.5,6.5,85000,SOP pending",
    "Arjun Mehta,+91 91234 56780,arjun@gmail.com,Amritsar,Australia,Feb 2027,Rohit Sharma,Test Prep,PTE,58,65,60000,Needs speaking practice",
  ].join("\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="previsahub-import-template.csv"',
    },
  });
}
