// File-backed mock store (offers + coupons). Server-side only.
// Real build swaps this for the xapi/Postgres data layer.

import fs from "fs";
import os from "os";
import path from "path";
import { festivalByKey } from "./festivals";
import { courseById } from "./catalog";
import {
  computeWindow, computeStatus, defaultMode, suggestDiscount,
  neutralCode, internalRef, priceAfter,
} from "./logic";

// On serverless (Vercel) the project dir is read-only; use the writable temp dir there.
// Data is per-instance and ephemeral in that case (it re-seeds), which is fine for this demo.
const DIR = process.env.VERCEL ? path.join(os.tmpdir(), "banner-studio") : path.join(process.cwd(), "data");
const FILE = path.join(DIR, "store.json");

let idSeq = 1000;
const nextId = () => `of_${++idSeq}`;
const nextCouponId = () => `cp_${++idSeq}`;

// Build a full offer object from minimal input.
export function buildOffer(input) {
  const {
    festivalKey, site = "invensis", courseId = "pmp", placeholder = "course_top_bar",
    year = new Date().getUTCFullYear(), mode, discountPct, countries, status = "scheduled",
    priority = 100, windowOverride, id, impressions = 0, clicks = 0,
  } = input;
  const fest = festivalByKey(festivalKey);
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

function couponFor(offer) {
  return {
    id: nextCouponId(),
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

function seed() {
  const y = 2026;
  const now = new Date();
  const spanNow = (before, after) => {
    const s = new Date(now); s.setUTCDate(s.getUTCDate() - before);
    const e = new Date(now); e.setUTCDate(e.getUTCDate() + after);
    return { eventDate: e.toISOString(), startsAt: s.toISOString(), endsAt: e.toISOString() };
  };
  const offers = [
    // Live now (windows span today)
    buildOffer({ festivalKey: "in_dussehra", courseId: "pmp", placeholder: "course_top_bar", year: y, status: "live", windowOverride: spanNow(4, 16), impressions: 24180, clicks: 1932 }),
    buildOffer({ festivalKey: "singles_day", courseId: "devops-f", placeholder: "popup_toast", year: y, status: "live", windowOverride: spanNow(2, 20), impressions: 9420, clicks: 612 }),
    // Scheduled (future festival windows)
    buildOffer({ festivalKey: "black_friday", courseId: "all", placeholder: "site_top_strip", year: y, status: "scheduled" }),
    buildOffer({ festivalKey: "us_thanksgiving", courseId: "pmp", placeholder: "course_top_bar", year: y, status: "scheduled" }),
    buildOffer({ festivalKey: "in_diwali", courseId: "pmp", placeholder: "home_hero", year: y, status: "scheduled" }),
    buildOffer({ festivalKey: "white_friday", courseId: "cobit-f", placeholder: "home_hero", year: y, status: "scheduled" }),
    // Draft
    buildOffer({ festivalKey: "in_republic_day", courseId: "csm", placeholder: "bottom_action_bar", year: y + 1, status: "draft" }),
    buildOffer({ festivalKey: "christmas", courseId: "all", placeholder: "site_top_strip", year: y, status: "draft" }),
  ];
  const coupons = offers.map(couponFor);
  return { offers, coupons };
}

function ensureStore() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(seed(), null, 2));
  }
}

function read() {
  ensureStore();
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (!raw || !Array.isArray(raw.offers) || !Array.isArray(raw.coupons)) throw new Error("bad shape");
  } catch {
    // corrupt or partially-written store: re-seed rather than 500 on every route
    raw = seed();
    fs.writeFileSync(FILE, JSON.stringify(raw, null, 2));
  }
  // keep idSeq ahead of existing ids across BOTH offers and coupons
  const bump = (id) => { const n = parseInt((id || "").split("_")[1], 10); if (Number.isFinite(n) && n > idSeq) idSeq = n; };
  raw.offers.forEach((o) => bump(o.id));
  raw.coupons.forEach((c) => bump(c.id));
  return raw;
}
function write(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

// ---- Public API ----
export function getOffers() {
  const { offers } = read();
  const now = new Date();
  return offers.map((o) => ({ ...o, status: computeStatus(o, now) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function getOffer(id) { return getOffers().find((o) => o.id === id); }

export function createOffer(input) {
  const data = read();
  const offer = buildOffer(input);
  data.offers.push(offer);
  data.coupons.push(couponFor(offer));
  write(data);
  return offer;
}
export function updateOffer(id, patch) {
  const data = read();
  const i = data.offers.findIndex((o) => o.id === id);
  if (i < 0) return null;
  data.offers[i] = { ...data.offers[i], ...patch };
  const ci = data.coupons.findIndex((c) => c.offerId === id);
  if (ci >= 0) {
    data.coupons[ci] = { ...data.coupons[ci], code: data.offers[i].couponCode, discountPct: data.offers[i].discountPct, countries: data.offers[i].countries, validFrom: data.offers[i].startsAt, validTo: data.offers[i].endsAt };
  }
  write(data);
  return data.offers[i];
}
export function deleteOffer(id) {
  const data = read();
  data.offers = data.offers.filter((o) => o.id !== id);
  data.coupons = data.coupons.filter((c) => c.offerId !== id);
  write(data);
  return true;
}
export function getCoupons() {
  const { coupons } = read();
  return coupons;
}
export function resetStore() { if (fs.existsSync(FILE)) fs.unlinkSync(FILE); ensureStore(); return read(); }
