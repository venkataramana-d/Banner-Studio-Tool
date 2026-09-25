import { NextResponse } from "next/server";
import { getCoupons, getOffers, getBlackouts } from "@/lib/store";
import { validateCoupon, REASON_TEXT, blackoutFor } from "@/lib/logic";

export const dynamic = "force-dynamic";

// Server-side coupon validation. Country comes from the trusted edge value in prod;
// here it's passed in for the demo. Enforces site + country + time window + limit,
// plus the approval gate: a coupon whose offer isn't approved cannot redeem.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ valid: false, message: "Invalid request." }, { status: 400 }); }
  const { code, site = "invensis", country } = body || {};
  // A neutral code can back several per-country offers, so pick the coupon whose
  // scope matches this visitor's country (else a global one, else the first).
  const cands = (await getCoupons()).filter((c) => c.code === code && c.site === site);
  const coupon = cands.find((c) => country && c.countries?.includes(country)) || cands.find((c) => !c.countries?.length) || cands[0];
  let result = validateCoupon(coupon, { country, site });
  if (result.valid && coupon) {
    const offer = (await getOffers()).find((o) => o.id === coupon.offerId);
    if (offer && (offer.approval || "approved") !== "approved") {
      result = { valid: false, reason: "not_approved" };
    }
  }
  if (result.valid) {
    const today = new Date().toISOString().slice(0, 10);
    if (blackoutFor(today, await getBlackouts())) result = { valid: false, reason: "blackout" };
  }
  return NextResponse.json({
    ...result,
    message: result.valid ? "Coupon applied." : REASON_TEXT[result.reason] || "This code isn't valid.",
  });
}
