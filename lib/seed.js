// Pure object builders + demo seed data, shared by the file store and the DB store.
// No I/O here, so both backends build identical offer/coupon shapes.

import { festivalByKey } from "./festivals";
import { courseById } from "./catalog";
import {
  computeWindow, defaultMode, suggestDiscount, neutralCode, internalRef,
} from "./logic";

// Collision-resistant ids that do not rely on a shared counter (safe across
// serverless instances). Seed rows use stable ids (below) so re-seeds dedupe.
let seq = 0;
const uid = (p) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const nextId = () => uid("of");

// Build a full offer object from minimal input.
export function buildOffer(input) {
  const {
    festivalKey, site = "invensis", courseId = "pmp", placeholder = "course_top_bar",
    year = new Date().getUTCFullYear(), mode, discountPct, countries, status = "scheduled",
    priority = 100, windowOverride, id, impressions = 0, clicks = 0,
  } = input;
  const isCustom = festivalKey === "custom";
  const fest = isCustom
    ? {
        key: "custom",
        name: input.customName || "Custom occasion",
        tier: input.customTier === "major" ? "major" : "normal",
        scope: input.customScope === "country" ? "country" : "global",
        motivation: input.creative?.headline || "Grow your skills",
        countries: input.customCountries || [],
      }
    : festivalByKey(festivalKey);
  if (!fest) throw new Error(`Unknown festival: ${festivalKey}`);
  const course = courseById(courseId);
  const m = mode || defaultMode(fest.tier);
  const disc = discountPct ?? suggestDiscount(fest.tier, m);
  const scope = fest.scope;
  const cs = scope === "global" ? [] : (countries || fest.countries || []);
  const win = windowOverride || computeWindow(fest, year, input.lead, input.trail) || {};
  const code = (input.couponCode && String(input.couponCode).trim()) || neutralCode(fest, year);
  const country0 = scope === "global" ? "GLB" : cs[0] || "GLB";
  return {
    id: id || nextId(),
    name: fest.name,
    festivalKey, site, tier: fest.tier, scope, countries: cs,
    courseId, courseName: course?.name || "All courses",
    placeholder, mode: m, discountPct: disc,
    year, lead: input.lead ?? fest.lead, trail: input.trail ?? fest.trail,
    eventDate: win.eventDate, startsAt: win.startsAt, endsAt: win.endsAt,
    couponCode: code, internalRef: internalRef(fest, country0, site),
    autoApply: !!input.autoApply,
    creative: input.creative || null, // { tagText, headline, valueLine, ctaText, showValue, showCta }
    status, priority, impressions, clicks,
    // approval gate: new offers default to draft; a submitted offer becomes pending,
    // then approved/rejected. Non-draft callers (seed, legacy) default to approved.
    approval: input.approval || (status === "draft" ? "draft" : "approved"),
    approvedBy: input.approvedBy || null,
    approvedAt: input.approvedAt || null,
    approvalNote: input.approvalNote || null,
    createdAt: new Date().toISOString(),
  };
}

// A reusable content template: a named festival + course + region + placeholder
// combo the Content Templates page can save and reload.
export function buildTemplate(input) {
  return {
    id: input.id || uid("tpl"),
    name: String(input.name || "Untitled template").trim().slice(0, 60) || "Untitled template",
    festivalKey: input.festivalKey,
    courseId: input.courseId || "pmp",
    regionKey: input.regionKey || "global",
    placeholder: input.placeholder || "course_top_bar",
    createdAt: new Date().toISOString(),
  };
}

// A blackout period: a date range during which no offer should run.
export function buildBlackout(input) {
  return {
    id: input.id || uid("bo"),
    label: String(input.label || "Blackout").trim().slice(0, 60) || "Blackout",
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt: new Date().toISOString(),
  };
}

// A coupon is 1:1 with an offer, so its id derives from the offer id. This keeps
// coupon ids unique and stable without a shared counter.
export function couponFor(offer) {
  return {
    id: `cp_${offer.id}`,
    code: offer.couponCode,
    internalRef: offer.internalRef,
    site: offer.site,
    offerId: offer.id,
    mode: offer.mode,
    discountPct: offer.discountPct,
    countries: offer.countries,
    validFrom: offer.startsAt,
    validTo: offer.endsAt,
    usageLimit: 1000,
    redeemed: offer.status === "live" ? Math.floor(Math.random() * 300 + 40) : 0,
    status: offer.status === "expired" ? "expired" : "active",
  };
}

// ---- Event tracking ----
// Events are stored as daily rollups: one row per (offer, day, country) holding
// impression/click/redemption counts. Ingest (recordEvent) upserts the current
// day's row; analytics aggregates rows within a chosen date range, which is what
// makes date filtering real. Deterministic ids let ingest and reseeds be idempotent.
export const ymd = (d) => d.toISOString().slice(0, 10);
export const eventId = (offerId, date, country) => `ev_${offerId}_${date}_${country}`;
export const EVENT_FIELD = { impression: "impressions", click: "clicks", redemption: "redemptions" };

// Build historical daily rollups by distributing each active offer's known totals
// across the last 90 days (skewed toward recent days), split by target country. The
// per-offer sums match exactly, so an "All time" range reconciles with the offer totals.
export function seedEvents(offers, coupons) {
  const redByOffer = {};
  coupons.forEach((c) => { redByOffer[c.offerId] = (redByOffer[c.offerId] || 0) + (c.redeemed || 0); });
  const DAYS = 90;
  const DAY_MS = 86400e3;
  const now = Date.now();
  const rows = [];
  for (const o of offers) {
    const imprTotal = o.impressions || 0;
    const clickTotal = o.clicks || 0;
    const redTotal = redByOffer[o.id] || 0;
    if (imprTotal + clickTotal + redTotal === 0) continue;
    const countries = o.scope === "global" ? ["GLB"] : (o.countries?.length ? o.countries : ["GLB"]);
    const weights = [];
    let wsum = 0;
    for (let d = 0; d < DAYS; d++) { const w = 0.4 + d / DAYS + 0.3 * Math.abs(Math.sin(d * 1.3)); weights.push(w); wsum += w; }
    const distribute = (total) => {
      const per = weights.map((w) => Math.floor((total * w) / wsum));
      let assigned = per.reduce((s, v) => s + v, 0), i = DAYS - 1;
      while (assigned < total) { per[i]++; assigned++; i = i === 0 ? DAYS - 1 : i - 1; }
      return per;
    };
    const imprPer = distribute(imprTotal), clickPer = distribute(clickTotal), redPer = distribute(redTotal);
    const split = (dayTotal, ci) => Math.floor(dayTotal / countries.length) + (ci < dayTotal % countries.length ? 1 : 0);
    for (let d = 0; d < DAYS; d++) {
      const date = ymd(new Date(now - (DAYS - 1 - d) * DAY_MS));
      countries.forEach((c, ci) => {
        const impressions = split(imprPer[d], ci), clicks = split(clickPer[d], ci), redemptions = split(redPer[d], ci);
        if (impressions + clicks + redemptions === 0) return;
        rows.push({ id: eventId(o.id, date, c), offerId: o.id, date, country: c, placeholder: o.placeholder, impressions, clicks, redemptions });
      });
    }
  }
  return rows;
}

// Demo data. Seed offers use stable ids (of_seed_<key>) so that if two serverless
// instances seed an empty database at once, the inserts collide and dedupe instead
// of doubling up.
export function seedData() {
  const y = 2026;
  const now = new Date();
  const spanNow = (before, after) => {
    const s = new Date(now); s.setUTCDate(s.getUTCDate() - before);
    const e = new Date(now); e.setUTCDate(e.getUTCDate() + after);
    return { eventDate: e.toISOString(), startsAt: s.toISOString(), endsAt: e.toISOString() };
  };
  const sid = (key) => `of_seed_${key}`;
  const offers = [
    // Live now (windows span today)
    buildOffer({ id: sid("in_dussehra"), festivalKey: "in_dussehra", courseId: "pmp", placeholder: "course_top_bar", year: y, status: "live", windowOverride: spanNow(4, 16), impressions: 24180, clicks: 1932 }),
    buildOffer({ id: sid("singles_day"), festivalKey: "singles_day", courseId: "devops-f", placeholder: "popup_toast", year: y, status: "live", windowOverride: spanNow(2, 20), impressions: 9420, clicks: 612 }),
    // Scheduled (future festival windows)
    buildOffer({ id: sid("black_friday"), festivalKey: "black_friday", courseId: "all", placeholder: "site_top_strip", year: y, status: "scheduled" }),
    buildOffer({ id: sid("us_thanksgiving"), festivalKey: "us_thanksgiving", courseId: "pmp", placeholder: "course_top_bar", year: y, status: "scheduled" }),
    buildOffer({ id: sid("in_diwali"), festivalKey: "in_diwali", courseId: "pmp", placeholder: "home_hero", year: y, status: "scheduled", approval: "pending" }),
    buildOffer({ id: sid("white_friday"), festivalKey: "white_friday", courseId: "cobit-f", placeholder: "home_hero", year: y, status: "scheduled", approval: "pending" }),
    // Draft
    buildOffer({ id: sid("in_republic_day"), festivalKey: "in_republic_day", courseId: "csm", placeholder: "bottom_action_bar", year: y + 1, status: "draft" }),
    buildOffer({ id: sid("christmas"), festivalKey: "christmas", courseId: "all", placeholder: "site_top_strip", year: y, status: "draft" }),
  ];
  const coupons = offers.map(couponFor);
  const events = seedEvents(offers, coupons);
  const blackouts = [
    buildBlackout({ id: "bo_seed_yearend", label: "Year-end maintenance freeze", startDate: `${y}-12-24`, endDate: `${y}-12-26` }),
  ];
  return { offers, coupons, events, blackouts };
}
