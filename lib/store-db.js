// Postgres-backed store (offers + coupons). Server-side only. Active when a
// connection string is present (POSTGRES_URL / DATABASE_URL). Works with Vercel
// Postgres and Neon; both are served by the @neondatabase/serverless HTTP driver,
// which is a good fit for serverless functions (no connection pool to manage).
//
// Each offer/coupon is stored as a JSONB blob keyed by id, so the shape matches the
// file store exactly and no column-by-column migration is needed.

import { computeStatus } from "./logic";
import { buildOffer, couponFor, seedData, buildTemplate, buildBlackout, eventId, ymd, EVENT_FIELD } from "./seed";

const CONN =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// Lazily create the client and ensure the schema + seed exactly once per instance.
let ready;
async function q() {
  if (!ready) {
    ready = (async () => {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(CONN);
      await init(sql);
      return sql;
    })();
  }
  return ready;
}

async function init(sql) {
  await sql`CREATE TABLE IF NOT EXISTS offers (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS coupons (
    id text PRIMARY KEY,
    offer_id text,
    data jsonb NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS templates (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS events (
    id text PRIMARY KEY,
    offer_id text,
    date date NOT NULL,
    country text,
    placeholder text,
    variant text,
    impressions int NOT NULL DEFAULT 0,
    clicks int NOT NULL DEFAULT 0,
    redemptions int NOT NULL DEFAULT 0
  )`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS variant text`;
  await sql`CREATE TABLE IF NOT EXISTS blackouts (
    id text PRIMARY KEY,
    label text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  const rows = await sql`SELECT count(*)::int AS n FROM offers`;
  if (rows[0].n === 0) await insertSeed(sql);
}

async function insertSeed(sql) {
  const { offers, coupons, events, blackouts } = seedData();
  // Seed rows have stable ids, so concurrent seeds from two instances collide and
  // dedupe via ON CONFLICT rather than doubling the data.
  for (const o of offers) {
    await sql`INSERT INTO offers (id, data, created_at) VALUES (${o.id}, ${JSON.stringify(o)}::jsonb, ${o.createdAt})
              ON CONFLICT (id) DO NOTHING`;
  }
  for (const c of coupons) {
    await sql`INSERT INTO coupons (id, offer_id, data) VALUES (${c.id}, ${c.offerId}, ${JSON.stringify(c)}::jsonb)
              ON CONFLICT (id) DO NOTHING`;
  }
  for (const b of blackouts) {
    await sql`INSERT INTO blackouts (id, label, start_date, end_date, created_at) VALUES (${b.id}, ${b.label}, ${b.startDate}, ${b.endDate}, ${b.createdAt})
              ON CONFLICT (id) DO NOTHING`;
  }
  // Events can number in the hundreds - insert them in one statement via UNNEST.
  if (events.length) {
    await sql`INSERT INTO events (id, offer_id, date, country, placeholder, impressions, clicks, redemptions)
      SELECT * FROM UNNEST(
        ${events.map((e) => e.id)}::text[],
        ${events.map((e) => e.offerId)}::text[],
        ${events.map((e) => e.date)}::date[],
        ${events.map((e) => e.country)}::text[],
        ${events.map((e) => e.placeholder)}::text[],
        ${events.map((e) => e.impressions)}::int[],
        ${events.map((e) => e.clicks)}::int[],
        ${events.map((e) => e.redemptions)}::int[]
      ) ON CONFLICT (id) DO NOTHING`;
  }
}

// ---- Public API (async) ----
export async function getOffers() {
  const sql = await q();
  const rows = await sql`SELECT data FROM offers`;
  const now = new Date();
  return rows
    .map((r) => ({ ...r.data, status: computeStatus(r.data, now) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getOffer(id) {
  return (await getOffers()).find((o) => o.id === id);
}

export async function createOffer(input) {
  const sql = await q();
  const offer = buildOffer(input);
  const coupon = couponFor(offer);
  await sql`INSERT INTO offers (id, data, created_at) VALUES (${offer.id}, ${JSON.stringify(offer)}::jsonb, ${offer.createdAt})`;
  await sql`INSERT INTO coupons (id, offer_id, data) VALUES (${coupon.id}, ${coupon.offerId}, ${JSON.stringify(coupon)}::jsonb)`;
  return offer;
}

export async function updateOffer(id, patch) {
  const sql = await q();
  const rows = await sql`SELECT data FROM offers WHERE id = ${id}`;
  if (!rows.length) return null;
  const updated = { ...rows[0].data, ...patch };
  await sql`UPDATE offers SET data = ${JSON.stringify(updated)}::jsonb WHERE id = ${id}`;
  const crows = await sql`SELECT data FROM coupons WHERE offer_id = ${id}`;
  if (crows.length) {
    const c = {
      ...crows[0].data,
      code: updated.couponCode, discountPct: updated.discountPct,
      countries: updated.countries, validFrom: updated.startsAt, validTo: updated.endsAt,
    };
    await sql`UPDATE coupons SET data = ${JSON.stringify(c)}::jsonb WHERE offer_id = ${id}`;
  }
  return updated;
}

export async function deleteOffer(id) {
  const sql = await q();
  await sql`DELETE FROM coupons WHERE offer_id = ${id}`;
  await sql`DELETE FROM offers WHERE id = ${id}`;
  return true;
}

export async function getCoupons() {
  const sql = await q();
  const rows = await sql`SELECT data FROM coupons`;
  return rows.map((r) => r.data);
}

export async function getTemplates() {
  const sql = await q();
  const rows = await sql`SELECT data FROM templates ORDER BY created_at DESC`;
  return rows.map((r) => r.data);
}

export async function createTemplate(input) {
  const sql = await q();
  const tpl = buildTemplate(input);
  await sql`INSERT INTO templates (id, data, created_at) VALUES (${tpl.id}, ${JSON.stringify(tpl)}::jsonb, ${tpl.createdAt})`;
  return tpl;
}

export async function deleteTemplate(id) {
  const sql = await q();
  await sql`DELETE FROM templates WHERE id = ${id}`;
  return true;
}

export async function getEvents() {
  const sql = await q();
  const rows = await sql`SELECT id, offer_id, date, country, placeholder, variant, impressions, clicks, redemptions FROM events`;
  return rows.map((r) => ({
    id: r.id, offerId: r.offer_id,
    date: typeof r.date === "string" ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10),
    country: r.country, placeholder: r.placeholder, variant: r.variant,
    impressions: r.impressions, clicks: r.clicks, redemptions: r.redemptions,
  }));
}

export async function getBlackouts() {
  const sql = await q();
  const rows = await sql`SELECT id, label, start_date, end_date, created_at FROM blackouts ORDER BY start_date`;
  return rows.map((r) => ({
    id: r.id, label: r.label,
    startDate: typeof r.start_date === "string" ? r.start_date.slice(0, 10) : new Date(r.start_date).toISOString().slice(0, 10),
    endDate: typeof r.end_date === "string" ? r.end_date.slice(0, 10) : new Date(r.end_date).toISOString().slice(0, 10),
    createdAt: r.created_at,
  }));
}
export async function createBlackout(input) {
  const sql = await q();
  const bo = buildBlackout(input);
  await sql`INSERT INTO blackouts (id, label, start_date, end_date, created_at) VALUES (${bo.id}, ${bo.label}, ${bo.startDate}, ${bo.endDate}, ${bo.createdAt})`;
  return bo;
}
export async function deleteBlackout(id) {
  const sql = await q();
  await sql`DELETE FROM blackouts WHERE id = ${id}`;
  return true;
}

export async function recordEvent(input) {
  const field = EVENT_FIELD[input?.type];
  if (!field || !input.offerId) return null;
  const sql = await q();
  const date = ymd(new Date());
  const country = input.country || "GLB";
  const variant = input.variant || null;
  const id = eventId(input.offerId, date, country, variant);
  const i = field === "impressions" ? 1 : 0;
  const c = field === "clicks" ? 1 : 0;
  const r = field === "redemptions" ? 1 : 0;
  await sql`INSERT INTO events (id, offer_id, date, country, placeholder, variant, impressions, clicks, redemptions)
    VALUES (${id}, ${input.offerId}, ${date}, ${country}, ${input.placeholder || null}, ${variant}, ${i}, ${c}, ${r})
    ON CONFLICT (id) DO UPDATE SET
      impressions = events.impressions + ${i},
      clicks = events.clicks + ${c},
      redemptions = events.redemptions + ${r}`;
  return { ok: true };
}

export async function resetStore() {
  const sql = await q();
  await sql`DELETE FROM coupons`;
  await sql`DELETE FROM offers`;
  await sql`DELETE FROM templates`;
  await sql`DELETE FROM events`;
  await sql`DELETE FROM blackouts`;
  await insertSeed(sql);
  return { ok: true };
}
