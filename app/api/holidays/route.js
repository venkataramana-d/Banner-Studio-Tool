import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Simple in-memory cache (per country-year) for the session.
const cache = new Map();

// Curated fallback for countries Nager.Date under-covers (e.g. India, GCC).
// National/public holidays only; religious festivals come from the curated calendar.
const FALLBACK = {
  IN: [[1, 1, "New Year's Day"], [1, 26, "Republic Day"], [5, 1, "Labour Day"], [8, 15, "Independence Day"], [10, 2, "Gandhi Jayanti"], [12, 25, "Christmas Day"]],
  US: [[1, 1, "New Year's Day"], [6, 19, "Juneteenth"], [7, 4, "Independence Day"], [11, 11, "Veterans Day"], [12, 25, "Christmas Day"]],
  GB: [[1, 1, "New Year's Day"], [12, 25, "Christmas Day"], [12, 26, "Boxing Day"]],
  CA: [[1, 1, "New Year's Day"], [7, 1, "Canada Day"], [12, 25, "Christmas Day"]],
  AU: [[1, 1, "New Year's Day"], [1, 26, "Australia Day"], [4, 25, "Anzac Day"], [12, 25, "Christmas Day"]],
  SG: [[1, 1, "New Year's Day"], [8, 9, "National Day"], [12, 25, "Christmas Day"]],
  DE: [[1, 1, "New Year's Day"], [5, 1, "Labour Day"], [10, 3, "German Unity Day"], [12, 25, "Christmas Day"]],
  ZA: [[1, 1, "New Year's Day"], [4, 27, "Freedom Day"], [12, 16, "Day of Reconciliation"], [12, 25, "Christmas Day"]],
  NG: [[1, 1, "New Year's Day"], [10, 1, "Independence Day"], [12, 25, "Christmas Day"]],
  MY: [[1, 1, "New Year's Day"], [8, 31, "Merdeka Day"], [9, 16, "Malaysia Day"], [12, 25, "Christmas Day"]],
  PH: [[1, 1, "New Year's Day"], [6, 12, "Independence Day"], [11, 30, "Bonifacio Day"], [12, 25, "Christmas Day"]],
  AE: [[1, 1, "New Year's Day"], [11, 30, "Commemoration Day"], [12, 2, "UAE National Day"], [12, 3, "UAE National Day Holiday"]],
  SA: [[2, 22, "Founding Day"], [9, 23, "Saudi National Day"]],
  QA: [[2, 11, "National Sports Day"], [12, 18, "Qatar National Day"]],
  KW: [[2, 25, "Kuwait National Day"], [2, 26, "Liberation Day"]],
};

function fallbackFor(country) {
  return (FALLBACK[country] || []).map(([m, d, name]) => ({ m, d, name, tier: "normal", public: true }));
}

// Merge two holiday lists, deduped by month-day.
function merge(primary, extra) {
  const seen = new Set(primary.map((h) => `${h.m}-${h.d}`));
  const out = [...primary];
  for (const h of extra) {
    if (!seen.has(`${h.m}-${h.d}`)) { out.push(h); seen.add(`${h.m}-${h.d}`); }
  }
  return out.sort((a, b) => a.m - b.m || a.d - b.d);
}

// Public/national holidays for any country. Auto-imported from the free Nager.Date API,
// supplemented by a curated fallback for countries it under-covers.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") || "").toUpperCase();
  const year = parseInt(searchParams.get("year") || "2026", 10);
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ holidays: [] });
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return NextResponse.json({ holidays: [] });

  const key = `${country}-${year}`;
  if (cache.has(key)) return NextResponse.json({ holidays: cache.get(key), cached: true });

  const fb = fallbackFor(country);
  let nager = [];
  let ok = false;
  let source = "nager";
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`, {
      headers: { Accept: "application/json" }, cache: "no-store",
    });
    if (res.ok) {
      const raw = await res.json();
      nager = (raw || []).map((h) => {
        const [, m, d] = h.date.split("-").map(Number);
        return { m, d, name: h.localName || h.name, tier: "normal", public: true };
      });
      ok = true;
    } else {
      source = `fallback (nager ${res.status})`;
    }
  } catch {
    source = "fallback (nager unreachable)";
  }

  const holidays = merge(nager, fb);
  // Only cache a successful Nager fetch; a transient outage must not poison the cache.
  if (ok) cache.set(key, holidays);
  return NextResponse.json({ holidays, source });
}
