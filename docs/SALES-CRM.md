# Pre Visa Hub — Tele-Sales CRM

The calling and tele-sales side of the business, at `/crm`.

---

## 1. System architecture

Next.js 14 App Router, one deployment, Postgres (Supabase) behind
`DATABASE_URL`. No separate backend service: the API routes *are* the backend.

```
Browser (client components)
      │  fetch /api/crm/*
      ▼
API routes ──── guard(permission) ────► 401 / 403
      │
      ▼
src/lib/leads/*   the only code that touches the lead tables
      │
      ▼
Postgres
```

**The one rule that shapes everything:** business rules live in
`src/lib/leads/`, not in the forms. A screen can be wrong; the server cannot.
Every rule below is enforced where the write happens, so a second screen — or
a script, or a future mobile app — cannot skip it.

### Pre-sale vs post-sale

This is a **separate domain** from the existing student/visa pipeline, on
purpose:

| | Sales CRM (`/crm`) | Case management (`/admin`) |
|---|---|---|
| Record | **Lead** — someone who might buy | **Student** — a file being processed |
| Question | will they convert? | where is the visa up to? |
| Ends at | Converted/Won | Visa approved |

They meet at exactly one column: `leads.handover_student_id`. Converting a
lead is the handover point.

---

## 2. Database schema

| Table | Holds | Notes |
|---|---|---|
| `leads` | the lead record | unique on the **last 10 digits** of the phone |
| `lead_calls` | every call | append-only |
| `lead_followups` | scheduled touches | rows, not a date column — see §5 |
| `lead_appointments` | consultations | drives the show-up rate |
| `lead_invoices` | sales | `balance` is never stored: always `total − paid` |
| `lead_activities` | the timeline | append-only; nothing updates or deletes |

Indexes cover the three ways the floor actually reads: *my leads*
(`lower(owner)`), *the queue* (`next_follow_up_date`), *the board* (`status`).

Schema creation is idempotent and memoised — one run per server instance, not
per request.

---

## 3. Modules

```
src/lib/leads/
  types.ts        statuses, sources, outcomes, roles, record shapes
  scoring.ts      the lead score, rule by rule
  schema.ts       tables and indexes
  repo.ts         read/write leads — scoring, timeline, queue all hang here
  calls.ts        logging a call, and the rules it must satisfy
  followups.ts    the cadence and the five queues
  appointments.ts consultations
  invoices.ts     sales and part payments
  stats.ts        every KPI and chart, counted in SQL
  auth.ts         who is asking, and what they may do
```

---

## 4. User roles

Permissions are checked server-side. The navigation only reflects them.

| | Admin | Manager | Sales Exec | Consultant | Case Manager |
|---|:--:|:--:|:--:|:--:|:--:|
| See everyone's leads | ✓ | ✓ | own only | ✓ | ✓ |
| Edit leads | ✓ | ✓ | ✓ | | |
| Reassign | ✓ | ✓ | | | |
| Delete | ✓ | | | | |
| Log calls | ✓ | ✓ | ✓ | | |
| Book consultations | ✓ | ✓ | ✓ | ✓ | |
| **See money** | ✓ | ✓ | | | |
| **Take money** | ✓ | | | | |
| Reports | ✓ | ✓ | | | |
| Change roles | ✓ | | | | |

A sales executive's dashboard does not *contain* the revenue figures — they
are left out of the response, not hidden in the page.

---

## 5. Workflow

```
New Lead → Attempted Contact → Contacted → Qualified → Consultation Booked
  → Consultation Completed → Interested → Documents Pending
  → Payment Pending → Converted/Won → (handover to case management)

off to the side:  Not Interested · Not Eligible · Lost · Cold Lead · Reactivation
```

The CRM moves the lead itself where the action says so — a call answered
"Interested" sets Interested, booking a consultation sets Consultation Booked,
clearing an invoice converts. It only ever moves a lead **forward**: a routine
chase call never knocks a lead back down the funnel.

### Follow-up cadence

Day **0, 1, 3, 6, 10, 15, 30** after the lead arrives, and again after every
call. Each active lead carries exactly one open follow-up.

Queues: **Overdue** (red) · **Today** (orange) · **Tomorrow** · **Upcoming**
(blue) · **Missed**.

*Missed* means the date genuinely went by. Replacing a follow-up that was not
yet due — booking a consultation, re-planning after a call — is *superseded*,
not missed. The distinction matters because missed follow-ups is a number
people are judged on.

### Lead score

| Rule | Points |
|---|--:|
| Knows the visa they want | 10 |
| Meets basic eligibility | 20 |
| Documents in hand | 15 |
| Budget in place | 15 |
| Applying within 30 days | 20 |
| Consultation completed | 10 |
| Ready to pay | 20 |
| English test done | 10 |

**0–30 Cold · 31–60 Warm · 61+ Hot.** The profile shows which rules fired, so
the score can be argued with rather than taken on faith.

### KPI formulas

```
Contact rate       = leads reached / total leads
Qualification rate = qualified / leads reached
Appointment rate   = appointments / qualified
Show-up rate       = consultations completed / consultations booked
Conversion rate    = converted / qualified
Revenue per lead   = total sales / total leads
Follow-up completion = done / (done + missed)
```

Written once, in `stats.ts`. The dashboard, the reports page and an
executive's own scorecard all read the same functions, so they cannot quote
different numbers for the same window.

---

## 6. API

| Route | Method | Permission |
|---|---|---|
| `/api/crm/session` | GET | any signed-in user |
| `/api/crm/leads` | GET / POST | scoped / `leads:edit` |
| `/api/crm/leads/[id]` | GET / PATCH / DELETE | ownership / `leads:edit` / `leads:delete` |
| `/api/crm/calls` | GET / POST | `calls:log` |
| `/api/crm/followups` | GET / POST | scoped |
| `/api/crm/appointments` | GET / POST / PATCH | `appointments:manage` |
| `/api/crm/invoices` | GET / POST | `money:view` / `money:edit` |
| `/api/crm/stats` | GET | scoped; money stripped without `money:view` |
| `/api/crm/team` | GET / PATCH | `leads:all` / `employees:manage` |

Searching, filtering and counting happen in SQL. The browser holds one page of
leads, never the whole book.

---

## 7. Screens

| Path | What it is |
|---|---|
| `/crm` | dashboard — KPIs by group, charts, employee table |
| `/crm/leads` | the list: search + seven filters, paged |
| `/crm/leads/[id]` | profile: record, score breakdown, timeline |
| `/crm/calling` | the caller's five tabs: to call, upcoming, transferred, call history, my calls (a scorecard whose every figure opens the calls behind it) |
| `/calling` | the same screen at the telecaller's own login |
| `/crm/followups` | the five queues |
| `/crm/pipeline` | Kanban, drag to move |
| `/crm/appointments` | consultation diary |
| `/crm/sales` | invoices and payments |
| `/crm/reports` | any date range, every report |
| `/crm/team` | scoreboard, and role assignment for the owner |

Sidebar + top bar with search, quick **+ Lead** and **Call queue**, and the
signed-in user. Responsive from phone to desktop.

---

## 8. Business rules, and where they are enforced

| # | Rule | Enforced in |
|---|---|---|
| 1 | Every lead has an owner | `repo.createLead` / `POST /leads` |
| 2 | Every call has an outcome | `calls.logCall` |
| 3 | Every active lead has a next follow-up | `calls.logCall`, `repo.updateLead` |
| 4 | No overdue follow-up is hidden | `followUpQueue("overdue")` — unbounded |
| 5 | Managers see all activity | `leads:all`, employee scoreboard |
| 6 | Sales staff cannot delete leads | `leads:delete` — admin only |
| 7 | Lost leads need a reason | `repo.updateLead`, `calls.logCall` |
| 8 | Converted leads record payment | `invoices.createInvoice` |
| 9 | Important changes are logged | `lead_activities`, append-only |
| 10 | A caller may hand a lead back, but only upward and never silently | `POST /leads/[id]/transfer` — own lead only, note required, stored on `leads.transfer_note` |
| 11 | Only a caller transfers; whoever can assign gives instead | `leads:assign` picks the button — an admin handing a lead "back to the admin" was handing it to themselves |

---

## 9. Not built yet

Honest list, so nobody assumes otherwise:

- **Manager alerts / notifications** — the data behind every alert exists
  (uncontacted, overdue, hot-and-inactive, consultation tomorrow, payment
  pending) and the dashboard surfaces them as figures, but nothing pushes.
- **Old Database / Reactivation module** — `coolOffStale()` moves 30-day-stale
  leads to Cold and the Reactivation status exists, but it needs to be run on a
  schedule and there is no separate re-engagement screen or lead importer yet.
- **Round-robin auto-assignment** — assignment is manual.
- **Automatic lead capture** from Facebook/Instagram/website forms.
