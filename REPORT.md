# Banner Studio - Build Report

Admin tool for Invensis Learning that runs festival and public-holiday offer banners
automatically by country and date.

- Repo: https://github.com/venkataramana-d/Banner-Studio-Tool
- Live: https://banner-studio-tool.vercel.app
- Stack: Next.js 14 (App Router), React 18, plain-CSS design system. Deployed on Vercel.

---

## Features delivered

### Pages
- Dashboard - live/scheduled counts, live offers, upcoming festivals, charts, alerts, live search.
- Campaigns - all offers with filters (status, country, category, tier, placeholder); click a row to edit; duplicate, pause/resume, delete.
- Festival Calendar - year + month + any country; global festivals marked worldwide; country festivals tagged with country codes; public holidays auto-imported (Nager.Date + curated fallback); booked indicator; next/prev month.
- Coupons - KPI tiles, a live coupon tester, inline code editing, copy, status filters, auto-apply tag.
- Content Templates - a full copy-authoring workspace: live generation of copy for all 5 slots with per-slot character budgets and auto-compact fallback; a brand-rule linter (no country/price/em dash) with one-click Fix; region localization (festival greeting + credibility hook, never names the country); bulk generate across many courses with Copy all + Export CSV; saved templates (persisted); and a campaign kit that pushes a launch-ready, prefilled offer into Create Offer. Plus the searchable motivation library, course value lines and localization-tone reference.
- Placeholders - the five on-site slots shown in a mock website, filled by active offers.
- Analytics - KPIs and charts (sample data, labelled).
- Settings - discount policy, 20%-off reconciliation, margin floor, sites, kill switch (all functional and persisted).

### Create / Edit offer (the core screen)
- Pick a festival -> auto tier + discount; hybrid 20%-off pricing with a 35% margin-floor guard.
- Custom occasions - create your own (e.g. Invensis Anniversary) with a name, tier, scope and date; it builds the window and coupon like a built-in festival.
- Global or country targeting (never shown on the banner).
- Editable coupon code, editable timeline (lead/trail days or exact start/end dates).
- Auto-apply links - hide the code so it can't be scraped; discount applies via the Enroll link.
- Editable Banner Editor - tag, headline, value line and button text, each with show/hide, in a live preview.
- Overlap prevention (one offer per placeholder x country) with a "publish anyway" override.
- Duplicate / clone (change the year to set up next year's campaign).

### Coupons page
- Redesigned code cell: code on top with Copy / Edit text links beneath and an auto-apply tag; inline code editing; live coupon tester that explains its result; KPI tiles; status filters.

### Cross-cutting
- Motivation-led banners: never show a country name or a price; no em dashes anywhere.
- Action toasts on every create/edit/delete/pause/coupon-edit/reset.
- Light and dark themes, keyboard focus states, aria labels, responsive to phone width.
- Top-bar search filters Dashboard, Campaigns and Coupons; persists across reloads.
- Pluggable persistence: a store facade selects Postgres (Vercel Postgres / Neon) when a connection string is set, else a file/mock store; the same API routes and UI work against either. Offers, coupons and templates persist across sessions and instances when a database is configured.

---

## Added after v1

- Removed the Edstellar site switcher (single-site build for now); added Teachers' Day (India, Sep 5).
- Persistence made pluggable (Postgres / Neon); fixed the cold-start "empty Campaigns/Coupons" flicker by retrying the data fetch with backoff instead of silently rendering an empty list.
- Content Templates rebuilt from a reference page into a generator: live copy for all placeholders, character budgets + compact fallback, brand-rule linter, region localization, bulk generate + CSV, saved templates, and campaign-kit -> Create Offer.

---

## Issues fixed

### Correctness / backend
- Store id-sequence bug that could create duplicate coupon ids after a restart.
- Three API routes returned 500 on bad JSON -> now return a clean 400.
- Invalid-date guards added to coupon validation and overlap detection.
- Holidays route no longer caches a transient outage; year validated.
- Vercel serverless filesystem is read-only -> store now writes to a temp dir there.

### Front-end / UX
- Dark mode: discount values, links and chips were near-invisible -> remapped brand tokens; fixed status pills.
- Added global focus-visible ring, reduced-motion support, aria labels and nav semantics.
- Fixed KPI grid overflow on mobile and the placeholder hero on small screens.
- Create-offer preview was breaking (text overflow + broken emoji) -> fixed layout and swapped unsupported emojis.

### Behaviour / clarity
- Calendar 404s (two dev servers clashing) -> consolidated; global vs country markers added.
- Coupon codes no longer contain a country code; Coupons page dropped the internal ref.
- Settings toggles and margin slider were dead controls -> now functional and persisted.
- Coupon code is editable; deleting an offer asks for confirmation.
- Coupon tester: empty input now gives feedback; rejections explain the window / eligible countries.
- "+ Offer" prefilled Diwali regardless of the festival clicked -> now uses the clicked festival.
- Editing an offer silently rescheduled it and took live offers offline -> now preserves the window.
- Invensis/Edstellar switcher was a dead toggle -> Edstellar disabled (v1.1).
- Analytics date-range selector did nothing -> disabled and figures labelled as sample.
- Sidebar "Campaigns" badge was a hardcoded 4 -> now shows the live-offer count.

### Quality process
- Ran multiple review agents (front-end, content, code-correctness, product) and two QA passes; fixed every confirmed finding. Production build passes with zero errors on each change.

---

## Locked product decisions
- Hybrid 20%-off rule (re-theme for normal, small extra for majors, above a 35% floor).
- Discount bands: Major 5-10%, Normal 10-15%.
- Invensis first; Edstellar in v1.1. Login deferred to just before go-live.

## Known limitations / next
- Persistence is now pluggable: set `POSTGRES_URL` (Vercel Postgres/Neon) and offers persist and are
  shared across instances; unset, it uses the ephemeral file/mock store. Cold-start empty flicker fixed
  on the client (retry-with-backoff) so a slow first request shows "Loading…", not a false empty list.
- Analytics figures are sample; they become real once event tracking lands on top of the DB.
- Remaining backlog: save-as-template, bulk-create, countdown banners, blackout dates, CSV export, approval step, A/B variants.
