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
    buildOffer({ id: sid("in_diwali"), festivalKey: "in_diwali", courseId: "pmp", placeholder: "home_hero", year: y, status: "scheduled" }),
    buildOffer({ id: sid("white_friday"), festivalKey: "white_friday", courseId: "cobit-f", placeholder: "home_hero", year: y, status: "scheduled" }),
    // Draft
    buildOffer({ id: sid("in_republic_day"), festivalKey: "in_republic_day", courseId: "csm", placeholder: "bottom_action_bar", year: y + 1, status: "draft" }),
    buildOffer({ id: sid("christmas"), festivalKey: "christmas", courseId: "all", placeholder: "site_top_strip", year: y, status: "draft" }),
  ];
  const coupons = offers.map(couponFor);
  return { offers, coupons };
}
