"use client";
import { useEffect, useState } from "react";
import { useUI } from "./ui-context";

export function useOffers() {
  const { version } = useUI();
  const [offers, setOffers] = useState(null);
  useEffect(() => {
    let on = true;
    fetch("/api/offers").then((r) => r.json()).then((j) => { if (on) setOffers(j.offers || []); }).catch(() => on && setOffers([]));
    return () => { on = false; };
  }, [version]);
  return offers;
}

export function useCoupons() {
  const { version } = useUI();
  const [coupons, setCoupons] = useState(null);
  useEffect(() => {
    let on = true;
    fetch("/api/coupons").then((r) => r.json()).then((j) => { if (on) setCoupons(j.coupons || []); }).catch(() => on && setCoupons([]));
    return () => { on = false; };
  }, [version]);
  return coupons;
}
