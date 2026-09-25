// Store facade. Exposes one async API and picks the backend at runtime:
//   - Postgres (lib/store-db) when a connection string is configured, or
//   - the file-backed mock (lib/store-file) for local dev / no-DB demos.
//
// Set POSTGRES_URL (or DATABASE_URL) to switch on real persistence. On Vercel,
// adding a Vercel Postgres / Neon integration sets this automatically; no code
// change is needed. buildOffer is pure, so it is re-exported synchronously.

export { buildOffer } from "./seed";

const USE_DB = !!(
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING
);

let implPromise;
function impl() {
  if (!implPromise) implPromise = USE_DB ? import("./store-db") : import("./store-file");
  return implPromise;
}

export async function getOffers() { return (await impl()).getOffers(); }
export async function getOffer(id) { return (await impl()).getOffer(id); }
export async function createOffer(input) { return (await impl()).createOffer(input); }
export async function updateOffer(id, patch) { return (await impl()).updateOffer(id, patch); }
export async function deleteOffer(id) { return (await impl()).deleteOffer(id); }
export async function getCoupons() { return (await impl()).getCoupons(); }
export async function getTemplates() { return (await impl()).getTemplates(); }
export async function createTemplate(input) { return (await impl()).createTemplate(input); }
export async function deleteTemplate(id) { return (await impl()).deleteTemplate(id); }
export async function resetStore() { return (await impl()).resetStore(); }
