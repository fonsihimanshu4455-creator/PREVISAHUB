// ---------------------------------------------------------------------------
// Lead scoring.
//
// A number the floor can argue with. Each rule is worth a fixed amount and
// says why it fired, so a lead's score is never a black box — the profile
// shows the breakdown, not just the total.
// ---------------------------------------------------------------------------

import { Lead, Priority, QUALIFIED_STATUSES } from "./types";

export type ScoreRule = {
  label: string;
  points: number;
  hit: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

/** Days from today until `date` (negative = in the past). "" = null. */
function daysUntil(date: string, today: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = Date.parse(date + "T00:00:00Z");
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()
  )) / DAY);
}

/**
 * Score a lead out of ~110. `today` is passed in rather than read from the
 * clock so the same lead scores the same in a test as in production.
 */
export function scoreLead(
  lead: Pick<
    Lead,
    | "visaType" | "destination" | "previousRefusal" | "education"
    | "workExperience" | "englishTest" | "budget" | "expectedApplication"
    | "status"
  >,
  today: Date = new Date()
): { score: number; rules: ScoreRule[] } {
  const days = daysUntil(lead.expectedApplication, today);

  const rules: ScoreRule[] = [
    {
      label: "Knows the visa they want",
      points: 10,
      hit: !!lead.visaType && !!lead.destination && lead.visaType !== "Other",
    },
    {
      label: "Meets basic eligibility",
      points: 20,
      // Refusal history is the single biggest drag on a visa file, so a lead
      // carrying one does not get the eligibility points on paperwork alone.
      hit: !lead.previousRefusal && !!lead.education.trim(),
    },
    {
      label: "Documents in hand",
      points: 15,
      hit: !!lead.education.trim() && !!lead.workExperience.trim(),
    },
    {
      label: "Budget in place",
      points: 15,
      hit: (lead.budget ?? 0) > 0,
    },
    {
      label: "Applying within 30 days",
      points: 20,
      hit: days !== null && days >= 0 && days <= 30,
    },
    {
      label: "Consultation completed",
      points: 10,
      hit: [
        "Consultation Completed", "Interested", "Documents Pending",
        "Payment Pending", "Converted/Won",
      ].includes(lead.status),
    },
    {
      label: "Ready to pay",
      points: 20,
      hit: ["Payment Pending", "Converted/Won"].includes(lead.status),
    },
    {
      label: "English test done",
      points: 10,
      hit: ["IELTS Done", "PTE Done", "Waiver / Not Required"].includes(
        lead.englishTest
      ),
    },
  ];

  const score = rules.reduce((n, r) => n + (r.hit ? r.points : 0), 0);
  return { score, rules };
}

/** 0–30 Cold · 31–60 Warm · 61+ Hot. */
export function priorityFromScore(score: number): Priority {
  if (score >= 61) return "Hot";
  if (score >= 31) return "Warm";
  return "Cold";
}

/** Convenience: score and classify in one step. */
export function rescore(lead: Parameters<typeof scoreLead>[0], today?: Date) {
  const { score, rules } = scoreLead(lead, today);
  return { score, rules, priority: priorityFromScore(score) };
}

/** Has this lead been judged worth working? Used by the KPI queries' mirror. */
export function isQualified(status: string): boolean {
  return (QUALIFIED_STATUSES as string[]).includes(status);
}
