// ---------------------------------------------------------------------------
// Pre Visa Hub — Admin CRM demo data & types
// This is mock/seed data used by the /admin CRM portal demo.
// In production these would come from a database / API.
// ---------------------------------------------------------------------------

export type VisaStage =
  | "Enquiry"
  | "Documentation"
  | "Test Prep"
  | "Application Filed"
  | "Biometrics"
  | "Approved"
  | "Rejected";

export const VISA_STAGES: VisaStage[] = [
  "Enquiry",
  "Documentation",
  "Test Prep",
  "Application Filed",
  "Biometrics",
  "Approved",
  "Rejected",
];

export type TestType = "IELTS" | "PTE" | "Not Taken";

export type Country =
  | "Canada"
  | "Australia"
  | "USA"
  | "UK"
  | "Germany"
  | "New Zealand";

export const COUNTRIES: Country[] = [
  "Canada",
  "Australia",
  "USA",
  "UK",
  "Germany",
  "New Zealand",
];

export type Student = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  country: Country;
  intake: string; // e.g. "Sep 2026"
  counsellor: string;
  stage: VisaStage;
  testType: TestType;
  // IELTS band 0-9 (0.5 steps) OR PTE score 10-90. Null = not taken.
  score: number | null;
  targetScore: number;
  lastUpdated: string; // ISO date
  nextFollowUp: string; // ISO date
  notes: string;
};

export type Task = {
  id: string;
  title: string;
  studentName: string;
  due: string; // ISO date
  priority: "High" | "Medium" | "Low";
  type: "Follow-up" | "Document" | "Test" | "Visa" | "Fee";
  done: boolean;
};

// Reference "today" for the demo so the UI is deterministic.
export const TODAY = "2026-08-09";

export const SEED_STUDENTS: Student[] = [
  {
    id: "PVH-1042",
    name: "Simran Kaur",
    phone: "+91 98765 43210",
    email: "simran.kaur@gmail.com",
    city: "Ludhiana",
    country: "Canada",
    intake: "Jan 2027",
    counsellor: "Rohit Sharma",
    stage: "Application Filed",
    testType: "IELTS",
    score: 7.5,
    targetScore: 6.5,
    lastUpdated: "2026-08-07",
    nextFollowUp: "2026-08-10",
    notes: "SOP approved. Waiting on GIC confirmation from bank.",
  },
  {
    id: "PVH-1043",
    name: "Arjun Mehta",
    phone: "+91 91234 56780",
    email: "arjun.mehta@gmail.com",
    city: "Amritsar",
    country: "Australia",
    intake: "Feb 2027",
    counsellor: "Neha Gupta",
    stage: "Test Prep",
    testType: "PTE",
    score: 58,
    targetScore: 65,
    lastUpdated: "2026-08-08",
    nextFollowUp: "2026-08-09",
    notes: "Needs 7 more points in Speaking. Booked mock test Saturday.",
  },
  {
    id: "PVH-1044",
    name: "Harleen Gill",
    phone: "+91 99887 76655",
    email: "harleen.gill@gmail.com",
    city: "Jalandhar",
    country: "UK",
    intake: "Sep 2026",
    counsellor: "Rohit Sharma",
    stage: "Biometrics",
    testType: "IELTS",
    score: 6.5,
    targetScore: 6.0,
    lastUpdated: "2026-08-06",
    nextFollowUp: "2026-08-11",
    notes: "Biometrics booked at VFS Chandigarh on 12 Aug.",
  },
  {
    id: "PVH-1045",
    name: "Karan Patel",
    phone: "+91 90000 11223",
    email: "karan.patel@gmail.com",
    city: "Ahmedabad",
    country: "USA",
    intake: "Jan 2027",
    counsellor: "Neha Gupta",
    stage: "Documentation",
    testType: "PTE",
    score: 72,
    targetScore: 65,
    lastUpdated: "2026-08-08",
    nextFollowUp: "2026-08-09",
    notes: "I-20 received. Preparing DS-160 form.",
  },
  {
    id: "PVH-1046",
    name: "Manpreet Singh",
    phone: "+91 98111 22334",
    email: "manpreet.s@gmail.com",
    city: "Patiala",
    country: "Canada",
    intake: "May 2027",
    counsellor: "Rohit Sharma",
    stage: "Enquiry",
    testType: "Not Taken",
    score: null,
    targetScore: 6.0,
    lastUpdated: "2026-08-08",
    nextFollowUp: "2026-08-09",
    notes: "Fresh lead from Instagram. Wants Canada SDS. Counselling pending.",
  },
  {
    id: "PVH-1047",
    name: "Pooja Verma",
    phone: "+91 97654 33210",
    email: "pooja.verma@gmail.com",
    city: "Delhi",
    country: "Germany",
    intake: "Oct 2026",
    counsellor: "Neha Gupta",
    stage: "Approved",
    testType: "IELTS",
    score: 8.0,
    targetScore: 6.5,
    lastUpdated: "2026-08-05",
    nextFollowUp: "2026-08-20",
    notes: "Visa APPROVED 🎉 Flight & accommodation guidance next.",
  },
  {
    id: "PVH-1048",
    name: "Ravi Choudhary",
    phone: "+91 96543 22110",
    email: "ravi.ch@gmail.com",
    city: "Chandigarh",
    country: "Australia",
    intake: "Feb 2027",
    counsellor: "Rohit Sharma",
    stage: "Test Prep",
    testType: "PTE",
    score: 45,
    targetScore: 65,
    lastUpdated: "2026-08-07",
    nextFollowUp: "2026-08-09",
    notes: "Struggling with Writing. Enrolled in weekend batch.",
  },
  {
    id: "PVH-1049",
    name: "Anjali Rana",
    phone: "+91 95432 11009",
    email: "anjali.rana@gmail.com",
    city: "Mohali",
    country: "New Zealand",
    intake: "Jul 2027",
    counsellor: "Neha Gupta",
    stage: "Documentation",
    testType: "IELTS",
    score: 7.0,
    targetScore: 6.5,
    lastUpdated: "2026-08-08",
    nextFollowUp: "2026-08-12",
    notes: "Awaiting academic transcripts from university.",
  },
  {
    id: "PVH-1050",
    name: "Gurpreet Dhillon",
    phone: "+91 94321 55667",
    email: "gurpreet.d@gmail.com",
    city: "Bathinda",
    country: "Canada",
    intake: "Sep 2026",
    counsellor: "Rohit Sharma",
    stage: "Rejected",
    testType: "IELTS",
    score: 6.0,
    targetScore: 6.0,
    lastUpdated: "2026-08-04",
    nextFollowUp: "2026-08-13",
    notes: "Refused — insufficient funds proof. Re-applying with co-sponsor.",
  },
  {
    id: "PVH-1051",
    name: "Sneha Kapoor",
    phone: "+91 93210 44556",
    email: "sneha.kapoor@gmail.com",
    city: "Panchkula",
    country: "UK",
    intake: "Jan 2027",
    counsellor: "Neha Gupta",
    stage: "Application Filed",
    testType: "PTE",
    score: 68,
    targetScore: 59,
    lastUpdated: "2026-08-08",
    nextFollowUp: "2026-08-10",
    notes: "CAS received. Visa application submitted, priority service.",
  },
  {
    id: "PVH-1052",
    name: "Vikram Joshi",
    phone: "+91 92109 33445",
    email: "vikram.joshi@gmail.com",
    city: "Jaipur",
    country: "USA",
    intake: "Aug 2027",
    counsellor: "Rohit Sharma",
    stage: "Enquiry",
    testType: "Not Taken",
    score: null,
    targetScore: 6.5,
    lastUpdated: "2026-08-09",
    nextFollowUp: "2026-08-09",
    notes: "Walk-in enquiry. Interested in MS in Computer Science.",
  },
  {
    id: "PVH-1053",
    name: "Ishita Bansal",
    phone: "+91 91098 22334",
    email: "ishita.bansal@gmail.com",
    city: "Ludhiana",
    country: "Australia",
    intake: "Feb 2027",
    counsellor: "Neha Gupta",
    stage: "Biometrics",
    testType: "IELTS",
    score: 7.5,
    targetScore: 6.5,
    lastUpdated: "2026-08-07",
    nextFollowUp: "2026-08-11",
    notes: "Medicals done. Biometrics scheduled 13 Aug.",
  },
];

export const SEED_TASKS: Task[] = [
  {
    id: "T-01",
    title: "Call for GIC confirmation follow-up",
    studentName: "Simran Kaur",
    due: "2026-08-09",
    priority: "High",
    type: "Follow-up",
    done: false,
  },
  {
    id: "T-02",
    title: "Share PTE Speaking practice material",
    studentName: "Arjun Mehta",
    due: "2026-08-09",
    priority: "Medium",
    type: "Test",
    done: false,
  },
  {
    id: "T-03",
    title: "Collect DS-160 details",
    studentName: "Karan Patel",
    due: "2026-08-09",
    priority: "High",
    type: "Visa",
    done: false,
  },
  {
    id: "T-04",
    title: "First counselling session",
    studentName: "Manpreet Singh",
    due: "2026-08-09",
    priority: "High",
    type: "Follow-up",
    done: false,
  },
  {
    id: "T-05",
    title: "Remind about weekend PTE batch",
    studentName: "Ravi Choudhary",
    due: "2026-08-09",
    priority: "Low",
    type: "Test",
    done: true,
  },
  {
    id: "T-06",
    title: "Confirm biometrics slot at VFS",
    studentName: "Harleen Gill",
    due: "2026-08-11",
    priority: "Medium",
    type: "Visa",
    done: false,
  },
  {
    id: "T-07",
    title: "Collect pending tuition fee installment",
    studentName: "Sneha Kapoor",
    due: "2026-08-10",
    priority: "Medium",
    type: "Fee",
    done: false,
  },
  {
    id: "T-08",
    title: "Chase university for transcripts",
    studentName: "Anjali Rana",
    due: "2026-08-12",
    priority: "Low",
    type: "Document",
    done: false,
  },
];

// --------------------------- helpers ---------------------------------------

export function isIeltsPass(s: Student): boolean {
  if (s.score === null) return false;
  return s.score >= s.targetScore;
}

export function formatScore(s: Student): string {
  if (s.testType === "Not Taken" || s.score === null) return "—";
  return s.testType === "IELTS" ? s.score.toFixed(1) : String(s.score);
}

export function stageColor(stage: VisaStage): string {
  switch (stage) {
    case "Enquiry":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "Documentation":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "Test Prep":
      return "bg-violet-100 text-violet-800 ring-violet-200";
    case "Application Filed":
      return "bg-blue-100 text-blue-800 ring-blue-200";
    case "Biometrics":
      return "bg-cyan-100 text-cyan-800 ring-cyan-200";
    case "Approved":
      return "bg-green-100 text-green-800 ring-green-200";
    case "Rejected":
      return "bg-red-100 text-red-800 ring-red-200";
  }
}

export function priorityColor(p: Task["priority"]): string {
  switch (p) {
    case "High":
      return "bg-red-100 text-red-700 ring-red-200";
    case "Medium":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    case "Low":
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

export function daysFromToday(iso: string): number {
  const a = new Date(TODAY + "T00:00:00");
  const b = new Date(iso + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeDue(iso: string): string {
  const d = daysFromToday(iso);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${Math.abs(d)} days ago`;
  return `In ${d} days`;
}

/** Rupee formatting, used by both server reports and client tables. */
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
