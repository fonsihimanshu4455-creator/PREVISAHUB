# Pre Visa Hub — Official Website

Next.js 14 + Tailwind CSS marketing site for **Pre Visa Hub** (Study Abroad Consultant).

## Stack
- Next.js 14 (App Router)
- React 18
- Tailwind CSS 3
- TypeScript

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

## Admin Panel (edit everything — no code needed)

Open **`/admin`** in your browser (e.g. http://localhost:3000/admin).

- **Default password:** `previsahub123` — change it under *Global Settings*.
- Every section has its **own page** in the sidebar: Logo, Navbar, Hero, Services,
  Countries, About, Contact, Footer, WhatsApp button, Theme & Colours, Global Settings.
- You can edit **all text, the logo, every photo/icon, colours, and the size of each
  element** (sizes are typed in pixels right in the panel).
- Click **Save** on each page. Open the website in another tab to see changes instantly.

### How saving works
- **With a database connected (recommended):** edits are saved on the server and
  are live for **all visitors, from any device**. You can log in to `/admin` from
  any phone or computer.
- **Without a database:** the site still works and you can edit, but changes are
  saved only in **the browser you used** (handy for trying things out).

The dashboard shows a banner telling you which mode you're in. Use
**Dashboard → Backup & Restore** any time to download/import a JSON backup.

## Make editing work everywhere (connect a free database)

Do this once so admin edits go live for everyone, from any device:

1. Open your project on **[vercel.com](https://vercel.com)** → **Storage** tab.
2. Click **Create Database** → choose a **Redis / KV** store (e.g. *Upstash Redis*
   — there is a free tier). Give it a name and create it.
3. **Connect** the store to this project (select all environments) when prompted.
   Vercel automatically adds the required environment variables
   (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or
   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).
4. **Redeploy**: Vercel → **Deployments** → latest → **⋯ → Redeploy**.
5. Done. Open `/admin`, and the dashboard banner should turn green:
   *“Database connected.”* Now every Save is live for all visitors.

### Change the admin password
- Easiest: in Vercel → **Settings → Environment Variables**, add
  `ADMIN_PASSWORD` = your password, then redeploy.
- Or, once a database is connected, change it in **Admin → Global Settings**.

> Note: the admin login is a lightweight gate (a shared password + secure
> cookie), not bank-grade security. Keep the `/admin` URL and password private.

## Contact
- Phone / WhatsApp: +91 89509 91108
- Instagram: [@pre.visa.hub_9](https://www.instagram.com/pre.visa.hub_9/)
