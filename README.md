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
- **Content Templates** - a full copy-authoring workspace, not just a reference:
  - **Generated copy for all 5 slots at once** - real filled copy (motivation + offer + course + code +
    date), each with a live character counter against the slot's budget; a line that overflows switches
    to a compact version automatically.
  - **Brand-rule linter** on every line (no country name, no price, no em dash) with a one-click Fix, so
    copy stays motivation-led by construction.
  - **Localization** - a region selector enriches copy with a festival greeting (Happy Diwali, Eid
    Mubarak...) and a per-region credibility hook (PDUs, CPD-aligned, KHDA-approved, globally
    recognized...), while never naming the country.
  - **Bulk generate** - the selected festival x many courses x all placeholders in one table, with Copy
    all and Export CSV for the whole campaign.
  - **Saved templates** - persist a festival + course + region + placeholder combo and reload it in one
    click (stored via the same backend as offers).
  - **Campaign kit -> Create Offer** - one click opens Create Offer prefilled with the localized banner
    copy, coupon, discount and auto-schedule; ready to review and Schedule.
  - Plus the searchable motivation library, course value lines and localization-tone reference.
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

**Data persistence:** the store auto-selects its backend at runtime (see `lib/store.js`):

- **No database configured (default):** a file-backed mock store. Vercel's serverless filesystem is
  read-only except for a temp dir, so there the store writes to `/tmp` and is **per-instance and
  ephemeral** - it re-seeds on cold starts and is not shared across instances. Fine for a demo, but a
  cold start can make Campaigns/Coupons look momentarily empty.
- **Database configured (recommended for production):** set `POSTGRES_URL` (or `DATABASE_URL`) and the
  store uses Postgres instead - data persists and is shared across instances. Offers/coupons are kept
  as JSONB, so no column migration is needed; the schema and demo seed are created automatically on
  first run.

**Turn on real persistence on Vercel:**

1. In the Vercel project, add a **Postgres** integration (Storage tab -> Create -> Postgres/Neon).
   Vercel sets `POSTGRES_URL` on the project automatically.
2. Redeploy. On first request the app creates the `offers` / `coupons` tables and seeds the demo data.
3. No code change is required - the same API routes and UI work against either backend.

Locally, copy `.env.example` to `.env.local` and paste a Neon connection string to develop against a
real database; leave it unset to use the file store.

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
    api/                offers, offers/[id], coupons, coupons/validate, templates, templates/[id], holidays, reset
    globals.css         Design system (light + dark tokens)
  components/           Sidebar, Topbar, OfferDrawer, Banner, Shell, ui-context, data hooks
  lib/                  config, catalog (courses), festivals, logic (scheduling/pricing/coupons),
                        content (copy engine: tokens, localization, bulk, kit), seed (shared builders),
                        store (facade) + store-file / store-db backends
  public/               invensis-logo.svg
```

## API (mock)

- `GET/POST /api/offers`, `GET/PUT/DELETE /api/offers/:id` - offer CRUD (POST does an overlap check).
- `GET /api/coupons`, `POST /api/coupons/validate` - list and server-side validation (site + country + window).
- `GET/POST /api/templates`, `DELETE /api/templates/:id` - saved content templates (POST validates the festival).
- `GET /api/holidays?country=IN&year=2026` - public holidays (Nager.Date + curated fallback).
- `POST /api/reset` - reseed the demo data.

---

## Roadmap (next)

Delivered since v1: pluggable Postgres persistence; editable Banner Editor; auto-apply coupon links;
duplicate / clone-to-next-year; and the Content Templates suite (generation, linter, localization,
bulk, saved templates, campaign-kit -> Create Offer).

Still open:

- Bulk-create offers across countries in one action (bulk copy generation already ships).
- Real analytics from stored impression/click/redemption data, with CSV export.
- Countdown banners, blackout dates, and A/B copy variants.
- Auth and a publish-approval gate (deferred to just before go-live).

## Notes

Nager.Date is reachable from a normal deployment; if it is ever unreachable, the curated holiday
fallback covers the main markets so the calendar always populates.
