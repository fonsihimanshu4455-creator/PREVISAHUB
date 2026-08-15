// ---------------------------------------------------------------------------
// Tele-sales CRM — the vocabulary of the department.
//
// Everything the sales floor argues about (what counts as qualified, what a
// call can end in, why a lead was lost) is spelled out once, here, so the
// database, the API and every screen agree. No screen invents its own list.
//
// This is the PRE-SALE half of the business: a lead is a person who might buy.
// The moment they do, they are handed to case management, which is the
// existing student/visa pipeline — see `handoverStudentId` on a lead.
// ---------------------------------------------------------------------------

// --------------------------------- status ----------------------------------

/**
 * The sales journey, in order. The order matters: the pipeline board, the
 * "next stage" suggestion and the won/lost split all read it from this array
 * rather than hard-coding a sequence of their own.
 */
export const OPEN_STATUSES = [
  "New Lead",
  "Attempted Contact",
  "Contacted",
  "Qualified",
  "Consultation Booked",
  "Consultation Completed",
  "Interested",
  "Documents Pending",
  "Payment Pending",
  "Converted/Won",
] as const;

/** Ends of the road. A lead sits in exactly one of these or in OPEN_STATUSES. */
export const CLOSED_STATUSES = [
  "Not Interested",
  "Not Eligible",
  "Lost",
  "Cold Lead",
  "Reactivation",
] as const;

export const LEAD_STATUSES = [...OPEN_STATUSES, ...CLOSED_STATUSES] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const WON_STATUS: LeadStatus = "Converted/Won";

/** Statuses that mean the lead is still being worked. */
export const ACTIVE_STATUSES: LeadStatus[] = OPEN_STATUSES.filter(
  (s) => s !== WON_STATUS
);

/** Statuses that mean nobody should be calling any more. */
export const DEAD_STATUSES: LeadStatus[] = [
  "Not Interested",
  "Not Eligible",
  "Lost",
];

/** From Qualified onwards the lead has been judged worth working. */
export const QUALIFIED_STATUSES: LeadStatus[] = [
  "Qualified",
  "Consultation Booked",
  "Consultation Completed",
  "Interested",
  "Documents Pending",
  "Payment Pending",
  WON_STATUS,
];

/**
 * What the CRM suggests next. A suggestion, not a rule — the executive can
 * pick any status, but the obvious forward step is one click away.
 */
export function nextStatus(current: LeadStatus): LeadStatus | null {
  const i = (OPEN_STATUSES as readonly string[]).indexOf(current);
  if (i < 0 || i >= OPEN_STATUSES.length - 1) return null;
  return OPEN_STATUSES[i + 1] as LeadStatus;
}

/** Where a status belongs on the board: the working lane or the closed lane. */
export function isOpen(status: LeadStatus): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

// --------------------------------- source ----------------------------------

export const LEAD_SOURCES = [
  "Facebook",
  "Instagram",
  "Google Ads",
  "Website",
  "WhatsApp",
  "Referral",
  "Walk-in",
  "Existing Client",
  "Old Database",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// ------------------------------- visa types --------------------------------

export const VISA_TYPES = [
  "Student",
  "Visitor / Tourist",
  "Work Permit",
  "Permanent Residence",
  "Business / Investor",
  "Spouse / Dependent",
  "Family Sponsorship",
  "Other",
] as const;
export type VisaType = (typeof VISA_TYPES)[number];

export const DESTINATIONS = [
  "Canada",
  "Australia",
  "USA",
  "UK",
  "Germany",
  "New Zealand",
  "Ireland",
  "Dubai / UAE",
  "Schengen",
  "Other",
] as const;

export const CURRENT_VISA_STATUSES = [
  "None",
  "Visitor",
  "Student",
  "Work Permit",
  "PR",
  "Refused Earlier",
  "Other",
] as const;

export const ENGLISH_TEST_STATUSES = [
  "Not Started",
  "Preparing",
  "Booked",
  "IELTS Done",
  "PTE Done",
  "Waiver / Not Required",
] as const;

// ------------------------------ call outcomes ------------------------------

export const CALL_OUTCOMES = [
  "Connected – Interested",
  "Connected – Not Interested",
  "Connected – Need Information",
  "No Answer",
  "Busy",
  "Wrong Number",
  "Call Back Requested",
  "WhatsApp Sent",
  "Appointment Booked",
  "Converted",
  "Not Eligible",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

/**
 * Which outcomes mean a human actually spoke to a human. Contact rate is built
 * on this, so it lives with the outcomes rather than inside a stats query.
 */
export const CONNECTED_OUTCOMES: CallOutcome[] = [
  "Connected – Interested",
  "Connected – Not Interested",
  "Connected – Need Information",
  "Call Back Requested",
  "Appointment Booked",
  "Converted",
  "Not Eligible",
];

/**
 * Outcomes that end the conversation for good. These are the only ones that
 * may be saved without a next follow-up date — everything else must leave the
 * lead with a date on it (business rule 3).
 */
export const TERMINAL_OUTCOMES: CallOutcome[] = [
  "Connected – Not Interested",
  "Wrong Number",
  "Not Eligible",
];

/** The status a call outcome implies, when it clearly implies one. */
export const OUTCOME_STATUS: Partial<Record<CallOutcome, LeadStatus>> = {
  "Connected – Interested": "Interested",
  "Connected – Not Interested": "Not Interested",
  "Connected – Need Information": "Contacted",
  "No Answer": "Attempted Contact",
  Busy: "Attempted Contact",
  "Appointment Booked": "Consultation Booked",
  Converted: "Converted/Won",
  "Not Eligible": "Not Eligible",
};

// ------------------------------ lost reasons -------------------------------

export const LOST_REASONS = [
  "Price Too High",
  "Not Eligible",
  "Changed Destination",
  "Previous Visa Refusal",
  "Not Ready",
  "No Response",
  "Competitor",
  "Family Decision Pending",
  "Financial Issue",
  "Documents Unavailable",
  "Visa Requirement Changed",
  "Other",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

/** Statuses that cannot be saved without a reason (business rule 7). */
export const REASON_REQUIRED: LeadStatus[] = ["Lost", "Not Interested", "Not Eligible"];

// -------------------------------- priority ---------------------------------

export const PRIORITIES = ["Hot", "Warm", "Cold"] as const;
export type Priority = (typeof PRIORITIES)[number];

// --------------------------------- roles -----------------------------------

/**
 * Who can do what. Every role sees a real subset of the business, not a
 * cosmetically reduced menu — the API checks these, see `can()`.
 */
export const CRM_ROLES = [
  "admin",
  "manager",
  "sales_executive",
  "consultant",
  "case_manager",
] as const;
export type CrmRole = (typeof CRM_ROLES)[number];

export const ROLE_LABELS: Record<CrmRole, string> = {
  admin: "Admin",
  manager: "Manager",
  sales_executive: "Sales Executive",
  consultant: "Consultant",
  case_manager: "Case Manager",
};

export type Permission =
  /** See leads belonging to other people. Without it you see only your own. */
  | "leads:all"
  | "leads:edit"
  | "leads:assign"
  | "leads:delete"
  | "calls:log"
  | "appointments:manage"
  /** Fees, payments, revenue — the owner's books. */
  | "money:view"
  | "money:edit"
  | "reports:view"
  | "employees:manage";

const ROLE_PERMISSIONS: Record<CrmRole, Permission[]> = {
  admin: [
    "leads:all", "leads:edit", "leads:assign", "leads:delete", "calls:log",
    "appointments:manage", "money:view", "money:edit", "reports:view",
    "employees:manage",
  ],
  // Runs the floor: everything except deleting records and touching accounts.
  manager: [
    "leads:all", "leads:edit", "leads:assign", "calls:log",
    "appointments:manage", "money:view", "reports:view",
  ],
  // Works their own list. No other executive's leads, and no money.
  sales_executive: ["leads:edit", "calls:log", "appointments:manage"],
  // Sees the people they are advising, and books/completes consultations.
  consultant: ["leads:all", "appointments:manage"],
  // Picks up where sales stops: won clients and their paperwork.
  case_manager: ["leads:all"],
};

export function can(role: CrmRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

// ---------------------- appointments and invoices --------------------------
// These live here, not beside their queries, because the forms that use them
// are browser components: importing them from a module that opens a database
// connection would drag the Postgres driver into the client bundle.

export const APPOINTMENT_STATUSES = [
  "Booked", "Confirmed", "Completed", "No Show", "Cancelled", "Rescheduled",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_KINDS = [
  "In-office", "Phone", "Video call", "Home visit",
] as const;

export type Appointment = {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  consultant: string;
  executive: string;
  date: string;
  time: string;
  visaType: string;
  kind: string;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
};

export const INVOICE_STATUSES = [
  "Pending", "Partially Paid", "Paid", "Refunded", "Cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAY_METHODS = [
  "Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other",
] as const;

export const SERVICES = [
  "Consultation Fee", "File Charges", "Visa Application", "IELTS / PTE Coaching",
  "Documentation", "Full Package", "Other",
] as const;

export type Invoice = {
  id: string;
  leadId: string;
  leadName: string;
  number: string;
  service: string;
  total: number;
  paid: number;
  /** Never stored — always total − paid, so the books cannot disagree. */
  balance: number;
  method: string;
  paidOn: string;
  status: InvoiceStatus;
  executive: string;
  consultant: string;
  notes: string;
  createdAt: string;
};

// ------------------------------- the record --------------------------------

export type Lead = {
  id: string;
  createdAt: string;
  source: LeadSource;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  residence: string;
  language: string;
  age: number | null;
  occupation: string;
  destination: string;
  visaType: VisaType;
  currentVisaStatus: string;
  previousRefusal: boolean;
  travelHistory: string;
  education: string;
  workExperience: string;
  englishTest: string;
  budget: number | null;
  expectedApplication: string;
  owner: string;
  score: number;
  status: LeadStatus;
  priority: Priority;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  lastContactDate: string;
  lastOutcome: string;
  lostReason: string;
  notes: string;
  /** Set once the lead converts and case management takes over. */
  handoverStudentId: string;
  updatedAt: string;
};

export const EMPTY_LEAD: Omit<Lead, "id" | "createdAt" | "updatedAt"> = {
  source: "Other",
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  residence: "India",
  language: "Punjabi",
  age: null,
  occupation: "",
  destination: "Canada",
  visaType: "Student",
  currentVisaStatus: "None",
  previousRefusal: false,
  travelHistory: "",
  education: "",
  workExperience: "",
  englishTest: "Not Started",
  budget: null,
  expectedApplication: "",
  owner: "",
  score: 0,
  status: "New Lead",
  priority: "Cold",
  nextFollowUpDate: "",
  nextFollowUpTime: "",
  lastContactDate: "",
  lastOutcome: "",
  lostReason: "",
  notes: "",
  handoverStudentId: "",
};
