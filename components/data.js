"use client";
import { useEffect, useState } from "react";
import { useUI } from "./ui-context";

// Fetch JSON with a few retries and backoff. A cold serverless instance can be slow
// or briefly error on the first hit; retrying keeps the UI in its "Loading…" state
// instead of falling through to a misleading empty list.
async function fetchJson(url, { signal, retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, { signal, cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 300 * 2 ** attempt)); // 300, 600, 1200, 2400ms
      }
    }
  }
  throw lastErr;
}

function useResource(url, pick) {
  const { version } = useUI();
  const [data, setData] = useState(null);
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null); // show loading again on refresh
    fetchJson(url, { signal: ctrl.signal })
      .then((j) => { if (!ctrl.signal.aborted) setData(pick(j) || []); })
      .catch(() => { if (!ctrl.signal.aborted) setData([]); }); // only after retries are exhausted
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return data;
}

export function useOffers() {
  return useResource("/api/offers", (j) => j.offers);
}

export function useCoupons() {
  return useResource("/api/coupons", (j) => j.coupons);
}

export function useTemplates() {
  return useResource("/api/templates", (j) => j.templates);
}

export function useEvents() {
  return useResource("/api/events", (j) => j.events);
}

export function useBlackouts() {
  return useResource("/api/blackouts", (j) => j.blackouts);
}

// Fire-and-forget event ingest (impression / click / redemption). Best-effort:
// never throws, uses keepalive so it survives navigation.
export function track(type, offerId, country, placeholder) {
  if (!offerId) return;
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, offerId, country, placeholder }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}
