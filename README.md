# Pre Visa Hub — Official Website

Next.js 14 + Tailwind CSS marketing site for **Pre Visa Hub** (Study Abroad Consultants), with a built-in admin panel for editing every page.

## Stack
- Next.js 14 (App Router) + React 18
- Tailwind CSS 3
- TypeScript
- Vercel Postgres for content storage

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Build for production
```bash
npm run build
npm run start
```

## Admin Panel

The site ships with an admin panel at `/admin` that lets you edit:
- Hero section (heading, tagline, CTAs, stats)
- Services (add / edit / delete / reorder)
- Countries (add / edit / delete / reorder)
- About section (paragraphs, feature points, stats)
- Contact info (phone, WhatsApp, Instagram, working hours)

Changes go live on the public website immediately after saving — no rebuild needed.

### Required environment variables

| Variable | Source | Purpose |
| --- | --- | --- |
| `POSTGRES_URL` (and friends) | Auto-added by Vercel when you attach a Postgres database | Stores all editable content |
| `ADMIN_PASSWORD` | You set this | Login password for the admin panel |
| `AUTH_SECRET` | You set this — any random string, 32+ chars | Signs the admin session cookie |

### One-time setup on Vercel

1. **Add a Postgres database**:
   - Vercel dashboard → Project → **Storage** tab → **Create Database** → **Postgres**
   - Connect it to this project (env vars are added automatically)
2. **Set the two env vars**:
   - Project → **Settings** → **Environment Variables**
   - Add `ADMIN_PASSWORD` = a strong password of your choice
   - Add `AUTH_SECRET` = a long random string (e.g. `openssl rand -hex 32`)
3. **Redeploy** the project.

That's it — visit `https://your-domain/login`, sign in, edit.

### Local development with the admin panel
Create a `.env.local` file:
```
POSTGRES_URL=...    # from Vercel Postgres "Quickstart" tab
ADMIN_PASSWORD=changeme
AUTH_SECRET=a_long_random_string_at_least_32_chars_here
```

Without these, the public site still works using bundled defaults, but the admin panel will not let you save.

## Contact
- Phone / WhatsApp: +91 89509 91108
- Instagram: [@pre.visa.hub_9](https://www.instagram.com/pre.visa.hub_9/)
