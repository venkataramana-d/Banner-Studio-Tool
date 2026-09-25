// File-backed store (offers + coupons). Server-side only. Used for local dev and
// as the fallback when no database connection string is configured.

import fs from "fs";
import os from "os";
import path from "path";
import { computeStatus } from "./logic";
import { buildOffer, couponFor, seedData, buildTemplate, eventId, ymd, EVENT_FIELD } from "./seed";

// On serverless (Vercel) the project dir is read-only; use the writable temp dir there.
// Data is per-instance and ephemeral in that case (it re-seeds). Configure a database
// (see lib/store-db.js) for real persistence.
const DIR = process.env.VERCEL ? path.join(os.tmpdir(), "banner-studio") : path.join(process.cwd(), "data");
const FILE = path.join(DIR, "store.json");

function ensureStore() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(seedData(), null, 2));
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
    raw = seedData();
    fs.writeFileSync(FILE, JSON.stringify(raw, null, 2));
  }
  if (!Array.isArray(raw.templates)) raw.templates = []; // added later; tolerate older stores
  if (!Array.isArray(raw.events)) raw.events = [];
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

// ---- Content templates ----
export function getTemplates() {
  const { templates } = read();
  return [...templates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function createTemplate(input) {
  const data = read();
  const tpl = buildTemplate(input);
  data.templates.push(tpl);
  write(data);
  return tpl;
}
export function deleteTemplate(id) {
  const data = read();
  data.templates = data.templates.filter((t) => t.id !== id);
  write(data);
  return true;
}

// ---- Events (daily rollups) ----
export function getEvents() {
  const { events } = read();
  return events;
}
export function recordEvent(input) {
  const field = EVENT_FIELD[input?.type];
  if (!field || !input.offerId) return null;
  const data = read();
  const date = ymd(new Date());
  const country = input.country || "GLB";
  const id = eventId(input.offerId, date, country);
  let row = data.events.find((e) => e.id === id);
  if (!row) {
    row = { id, offerId: input.offerId, date, country, placeholder: input.placeholder || null, impressions: 0, clicks: 0, redemptions: 0 };
    data.events.push(row);
  }
  row[field] = (row[field] || 0) + 1;
  write(data);
  return row;
}

export function resetStore() { if (fs.existsSync(FILE)) fs.unlinkSync(FILE); ensureStore(); return read(); }
