# Student CRM — setup

The admin panel now has two separate tools, both behind the same login:

| Page          | What it does                                        | Storage                  |
| ------------- | --------------------------------------------------- | ------------------------ |
| `/admin`      | Edit the website (hero, services, logo, theme, …)   | Upstash Redis / Vercel KV |
| `/admin/crm`  | Student CRM — visa status, IELTS/PTE scores, tasks  | Postgres (`DATABASE_URL`) |

They use different databases and do not interfere with each other. Setting up
the CRM does not change website editing, and vice versa.

Without `DATABASE_URL`, `/admin/crm` still opens and shows starter data with a
warning banner — nothing is saved until the database is connected.

---

## 1. Create a Postgres database

Supabase is free and works well here.

1. Go to https://supabase.com → **New project**
2. Pick a region (**South Asia (Mumbai)** for India) and set a database
   password — **save that password**, it is needed in the next step
3. Wait for the project to finish provisioning

### Get the connection string

Open **Connect** (or **Settings → Database**) and copy the **Transaction
pooler** URI.

> **Use the pooler, not the direct connection.** Vercel cannot reach Supabase's
> direct database host, so a direct URL will fail at runtime. The correct one
> contains `pooler` and port `6543`.

You can also build it yourself — only the project ref, password and region
change:

```
postgresql://postgres.<PROJECT-REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres
```

The project ref is the random string in your Supabase dashboard URL
(`supabase.com/dashboard/project/<PROJECT-REF>`). Common regions:
`ap-south-1` (Mumbai), `ap-southeast-1` (Singapore), `us-east-1`,
`eu-central-1`.

Keep the password to letters and numbers — `@ : / #` and friends have special
meaning inside a URL and will break the connection.

---

## 2. Add the environment variables in Vercel

**Project → Settings → Environment Variables:**

| Name           | Value                                             |
| -------------- | ------------------------------------------------- |
| `DATABASE_URL` | the pooler URI from step 1, password filled in    |
| `SEED_TOKEN`   | any secret word, e.g. `pvh2026x` (used once)      |

Redeploy after adding them — Vercel only picks up new variables on a fresh
build.

---

## 3. Create the tables (once)

Log in at `/admin`, then open:

```
/api/seed
```

An admin session is enough. If you would rather not log in first, use the
token instead:

```
/api/seed?token=pvh2026x
```

Expected response:

```json
{ "ok": true, "seeded": true, "message": "Tables created and starter data loaded." }
```

Safe to run more than once — it only seeds when the tables are empty.

---

## Checking it worked

Open `/admin/crm`. The badge at the top right tells you the state:

- **Live · Database** (green) — connected, everything saves
- **Demo data** (amber) — `DATABASE_URL` missing or wrong; the banner shows the
  underlying error

---

## Security

Everything under `/admin` requires the admin password, and every CRM API route
rejects unauthenticated requests — including reads, since student records are
personal data.

Change the default password (`previsahub123`) from **Global Settings** before
putting real student data in. Changing it also signs out all existing sessions.

---

## Local development

```bash
npm install
cat > .env.local <<'ENV'
DATABASE_URL=postgresql://...
SEED_TOKEN=dev123
ENV
npm run dev
```

Log in at http://localhost:3000/admin, open
http://localhost:3000/api/seed once, then use http://localhost:3000/admin/crm

---

## API reference

All routes require an admin session.

| Method  | Route                | Purpose                                  |
| ------- | -------------------- | ---------------------------------------- |
| `GET`   | `/api/students`      | List students                            |
| `POST`  | `/api/students`      | Add a student / lead                     |
| `PATCH` | `/api/students/[id]` | Update stage, test type, score, notes    |
| `GET`   | `/api/tasks`         | List daily tasks                         |
| `PATCH` | `/api/tasks/[id]`    | Mark a task done / not done              |
| `GET`   | `/api/seed`          | One-time table creation (session or token) |
