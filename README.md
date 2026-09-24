# Banner Studio

Admin tool for **Invensis Learning** that runs festival and public-holiday offer banners
**automatically** by country and date. Marketing creates an offer once; it goes live on its own
around the occasion and switches off after, with a country-scoped coupon and a live banner preview.

- **Repo:** https://github.com/venkataramana-d/Banner-Studio-Tool
- **Live (Vercel):** https://banner-studio-tool.vercel.app
- **Stack:** Next.js 14 (App Router), React 18, plain CSS design system. No database required for the demo.

This is the standalone v1 built with a mock data layer. It is designed to later plug into the real
Invensis app and `xapi` backend.

---

## Features

- **Dashboard** - live/scheduled counts, live offers, upcoming festivals, charts, and a search that
  filters the view as you type.
- **Campaigns** - every offer with filters (status, country, category, tier, placeholder); click any
  row to edit.
- **Create / Edit offer** - festival, mode, discount, course, placeholder, editable coupon code,
  editable timeline (lead/trail days or exact dates), a margin-floor guard, overlap prevention, and a
  live banner preview.
- **Festival Calendar** - pick a year, month, and any country to see its festivals and public
  holidays (public holidays auto-imported from the free Nager.Date API, with a curated fallback).
  Booked festivals are flagged so offers never double-book a placeholder.
- **Coupons** - neutral codes (no country in the code), scoped to site + country + time window, with
  a live coupon tester that shows the server-side enforcement.
- **Content Templates** - a template builder with live preview and copy text, copy formulas, a
  searchable motivation library, course value lines, and localization tone.
- **Placeholders** - the five on-site slots shown in a mock website, filled by your active offers.
- **Analytics** and **Settings** - KPIs and charts; discount policy, margin floor, sites, geo source,
  and a master kill switch (all interactive and persisted).
- Light and dark themes, keyboard focus states, and responsive down to phone width.

## Core rules (locked product decisions)

- **Hybrid 20% rule** - normal occasions re-theme the site's existing 20%; major tentpoles add a small
  extra on top, always kept above the **35% margin floor**.
- **Discount bands** - Major 5-10%, Normal 10-15%.
- **Banners** - motivation-led; they never show a country name or a price.
- **Auto scheduling** - an offer goes live `lead` days before its festival and expires `trail` days
  after (or on exact dates you set).
- **Overlap prevention** - one offer per placeholder per country at a time.

---

## Getting started (local)

Requires Node 18+ (built and tested on Node 20/24).

```bash
git clone https://github.com/venkataramana-d/Banner-Studio-Tool.git
cd Banner-Studio-Tool/banner-studio-app   # if the app lives in a subfolder
npm install
npm run dev
```

Open http://localhost:4300

Useful scripts:

```bash
npm run dev     # dev server on port 4300
npm run build   # production build
npm run start   # run the production build
```

---

## Deploy on Vercel

1. Import the GitHub repo at https://vercel.com/new
2. If the app is in the `banner-studio-app` subfolder, set **Root Directory = banner-studio-app**
   in the Vercel project settings. Framework preset auto-detects as **Next.js**; leave build and
   output settings as default.
3. No environment variables are required.
4. Deploy. Vercel builds with `next build` and serves the App Router routes and API routes.

**Data persistence note:** the demo uses a small file-backed mock store. Vercel's serverless
filesystem is read-only except for a temporary directory, so on Vercel the store writes to `/tmp` and
is **per-instance and ephemeral** - it re-seeds on cold starts and is not shared across instances.
This is fine for a demo. For real persistence, replace `lib/store.js` with a database (or the
Invensis `xapi` backend); the API routes and UI stay the same.

---

## Project structure

```
banner-studio-app/
  app/
    page.jsx            Dashboard
    campaigns/          Offers list + filters
    calendar/           Festival + public-holiday calendar
    coupons/            Coupons + live tester
    content/            Content templates + builder
    placeholders/       On-site slot mockups
    analytics/          KPIs + charts
    settings/           Policy, guardrails, kill switch
    api/                offers, offers/[id], coupons, coupons/validate, holidays, reset
    globals.css         Design system (light + dark tokens)
  components/           Sidebar, Topbar, OfferDrawer, Banner, Shell, ui-context, data hooks
  lib/                  config, catalog (courses), festivals, logic (scheduling/pricing/coupons), store
  public/               invensis-logo.svg
```

## API (mock)

- `GET/POST /api/offers`, `GET/PUT/DELETE /api/offers/:id` - offer CRUD (POST does an overlap check).
- `GET /api/coupons`, `POST /api/coupons/validate` - list and server-side validation (site + country + window).
- `GET /api/holidays?country=IN&year=2026` - public holidays (Nager.Date + curated fallback).
- `POST /api/reset` - reseed the demo data.

---

## Roadmap (next)

- Fully editable Banner Editor with show/hide toggles for every element.
- Auto-apply coupon links (no visible code) to reduce leakage.
- Duplicate / clone-to-next-year / bulk-create across countries, and save-as-template.
- Real analytics from stored impression/click/redemption data, with CSV export.
- Auth and a publish-approval gate (deferred to just before go-live).

## Notes

Nager.Date is reachable from a normal deployment; if it is ever unreachable, the curated holiday
fallback covers the main markets so the calendar always populates.
