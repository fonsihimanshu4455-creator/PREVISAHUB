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
Content is stored in your browser (`localStorage`), so the site works without a
database or server. Use **Dashboard → Backup & Restore** to:
- **Download backup** — save all your content as a JSON file.
- **Import backup** — load content (also handy to move it to another device/browser).
- **Reset to defaults** — restore the original website content.

> Note: the admin login is a lightweight gate, not bank-grade security. Keep the
> `/admin` URL and password private. For multi-device shared editing, connect a real
> backend/CMS later.

## Contact
- Phone / WhatsApp: +91 89509 91108
- Instagram: [@pre.visa.hub_9](https://www.instagram.com/pre.visa.hub_9/)
