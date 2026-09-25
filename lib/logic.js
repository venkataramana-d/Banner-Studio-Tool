// Core automation logic: scheduling windows, status, overlap prevention,
// the hybrid 20%-off pricing rule, margin guard, and coupon codes + validation.

import { POLICY } from "./config";
import { resolveFestivalDate } from "./festivals";

// ---- Scheduling ----
export function computeWindow(fest, year, leadOverride, trailOverride) {
  const dt = resolveFestivalDate(fest, year);
  if (!dt) return null;
  const lead = leadOverride ?? fest.lead;
  const trail = trailOverride ?? fest.trail;
  const eventDate = new Date(Date.UTC(dt.y, dt.m - 1, dt.d));
  const startsAt = new Date(eventDate);
  startsAt.setUTCDate(startsAt.getUTCDate() - lead);
  const endsAt = new Date(eventDate);
  endsAt.setUTCDate(endsAt.getUTCDate() + trail);
  return {
    eventDate: eventDate.toISOString(),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function computeStatus(offer, now = new Date()) {
  if (offer.status === "draft" || offer.status === "paused") return offer.status;
  // Approval gate: an offer only reaches its schedule (scheduled/live/expired) once
  // approved. Offers created before the gate existed have no `approval` field and are
  // treated as approved so nothing silently goes dark.
  const approval = offer.approval || "approved";
  if (approval === "rejected") return "rejected";
  if (approval === "pending" || approval === "draft") return "pending";
  if (!offer.startsAt || !offer.endsAt) return offer.status || "draft";
  const s = new Date(offer.startsAt);
  const e = new Date(offer.endsAt);
  if (now < s) return "scheduled";
  if (now > e) return "expired";
  return "live";
}

// ---- Overlap prevention (one offer per placeholder x country at a time) ----
export function offersOverlap(a, b) {
  if (a.id === b.id) return false;
  if (a.site !== b.site) return false;
  if (a.placeholder !== b.placeholder) return false;
  let countryClash;
  if (a.scope === "global" && b.scope === "global") countryClash = true;
  else if (a.scope === "global" || b.scope === "global") countryClash = false; // priority resolves
  else countryClash = (a.countries || []).some((c) => (b.countries || []).includes(c));
  if (!countryClash) return false;
  const as = new Date(a.startsAt), ae = new Date(a.endsAt), bs = new Date(b.startsAt), be = new Date(b.endsAt);
  if ([as, ae, bs, be].some((d) => isNaN(d))) return false; // undated offers can't be live, so no conflict
  return as <= be && bs <= ae;
}

export function findConflicts(offer, offers) {
  return offers.filter((o) => o.status !== "expired" && offersOverlap(offer, o));
}

// ---- Hybrid pricing rule ----
export function defaultMode(tier) {
  return tier === "major" ? "extra" : "retheme";
}

export function suggestDiscount(tier, mode) {
  if (mode === "retheme") return POLICY.existingSiteDiscountPct; // show the existing 20%
  if (mode === "replace") return tier === "major" ? 30 : 25;
  return (POLICY.bands[tier] || POLICY.bands.normal).max; // extra on top: major 10, normal 15
}

export function priceAfter(price, mode, discountPct) {
  const current = price * (1 - POLICY.existingSiteDiscountPct / 100); // always-on 20% off
  if (mode === "retheme") return Math.round(current);
  if (mode === "extra") return Math.round(current * (1 - discountPct / 100));
  if (mode === "replace") return Math.round(price * (1 - discountPct / 100));
  return Math.round(current);
}

export function marginOk(price, festPrice) {
  return festPrice >= price * (1 - POLICY.marginFloorPct / 100);
}

// Human countdown for a banner, e.g. "Ends today" / "Ends in 3 days". Null once past.
export function countdownText(endsAt, now = new Date()) {
  if (!endsAt) return null;
  const e = new Date(endsAt);
  if (isNaN(e)) return null;
  const ms = e - now;
  if (ms <= 0) return null;
  const days = Math.ceil(ms / 86400000);
  return days <= 1 ? "Ends today" : `Ends in ${days} days`;
}

export function displayLabel(mode, discountPct) {
  if (mode === "retheme") return `${POLICY.existingSiteDiscountPct}% OFF`;
  if (mode === "extra") return `Extra ${discountPct}% OFF`;
  return `${discountPct}% OFF`;
}

// ---- Coupon codes ----
export function neutralCode(fest, year) {
  // Strip any parenthetical country (e.g. "(India)") so the code never carries a country.
  const clean = fest.name.replace(/\s*\([^)]*\)/g, "");
  const base = clean.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return base + String(year).slice(-2);
}

export function internalRef(fest, countryOrGlobal, site) {
  const base = fest.key.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const cc = countryOrGlobal || "GLB";
  return `${base}-${cc}-${site.toUpperCase().slice(0, 3)}`;
}

export function validateCoupon(coupon, { country, now = new Date(), site } = {}) {
  if (!coupon || coupon.status !== "active") return { valid: false, reason: "invalid_code" };
  if (site && coupon.site !== site) return { valid: false, reason: "wrong_site" };
  const s = new Date(coupon.validFrom);
  const e = new Date(coupon.validTo);
  if (isNaN(s) || isNaN(e) || now < s || now > e) return { valid: false, reason: "expired_or_not_started" };
  if (coupon.countries && coupon.countries.length && country && !coupon.countries.includes(country))
    return { valid: false, reason: "wrong_country" };
  if (coupon.usageLimit && coupon.redeemed >= coupon.usageLimit)
    return { valid: false, reason: "usage_exhausted" };
  return { valid: true, discountPct: coupon.discountPct, mode: coupon.mode };
}

export const REASON_TEXT = {
  invalid_code: "This code isn't valid.",
  wrong_site: "This code doesn't work on this site.",
  expired_or_not_started: "This offer isn't active right now.",
  wrong_country: "This offer isn't available in your country.",
  usage_exhausted: "This offer has reached its limit.",
  not_approved: "This offer isn't active right now.",
};
