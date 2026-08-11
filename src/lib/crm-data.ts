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
  telecaller?: string;
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

/**
 * Visa stages are a progression, not a set of unrelated categories — so they
 * are encoded as one hue deepening as a student advances, rather than seven
 * arbitrary colours. (Seven hues also failed colour-blind separation: blue,
 * teal and purple collapse into each other.) The two terminal outcomes leave
 * the ramp and use the reserved status colours instead.
 */
export function stageColor(stage: VisaStage): string {
  switch (stage) {
    case "Enquiry":
      return "bg-[#eef1f6] text-[#4a5568] ring-[#dce1ea]";
    case "Documentation":
      return "bg-[#dde6f5] text-[#2d5180] ring-[#c6d5ec]";
    case "Test Prep":
      return "bg-[#c6d9f1] text-[#22447a] ring-[#a9c4e6]";
    case "Application Filed":
      return "bg-[#aac6e9] text-[#1a3a6d] ring-[#8bb0dd]";
    case "Biometrics":
      return "bg-[#8aaedd] text-[#14305e] ring-[#6d97cf]";
    case "Approved":
      return "bg-[color:var(--good-soft)] text-[color:var(--good)] ring-[#bfe3d2]";
    case "Rejected":
      return "bg-[color:var(--crit-soft)] text-[color:var(--crit)] ring-[#f3c9c4]";
  }
}

/** Fill for a stage on a chart — the same ramp, at mark strength. */
export function stageFill(stage: VisaStage): string {
  const ramp: Record<VisaStage, string> = {
    Enquiry: "#b9c2d1",
    Documentation: "#8fa8cd",
    "Test Prep": "#6b8dc0",
    "Application Filed": "#4a72b0",
    Biometrics: "#2d569b",
    Approved: "#0f7a52",
    Rejected: "#b02a1f",
  };
  return ramp[stage];
}

export function priorityColor(p: Task["priority"]): string {
  switch (p) {
    case "High":
      return "bg-[color:var(--crit-soft)] text-[color:var(--crit)] ring-[#f3c9c4]";
    case "Medium":
      return "bg-[color:var(--warn-soft)] text-[color:var(--warn)] ring-[#f0dcbb]";
    case "Low":
      return "bg-[color:var(--surface-sunk)] text-[color:var(--text-muted)] ring-[color:var(--line)]";
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

/**
 * Short rupees for headline figures — ₹2.12 Cr rather than ₹2,12,00,000.
 * Lakh and crore are how these amounts get said out loud here, and the full
 * number overflows a stat card once it passes a few lakh.
 */
export function formatINRShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}
