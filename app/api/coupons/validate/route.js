import { NextResponse } from "next/server";
import { getCoupons } from "@/lib/store";
import { validateCoupon, REASON_TEXT } from "@/lib/logic";

export const dynamic = "force-dynamic";

// Server-side coupon validation. Country comes from the trusted edge value in prod;
// here it's passed in for the demo. Enforces site + country + time window + limit.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ valid: false, message: "Invalid request." }, { status: 400 }); }
  const { code, site = "invensis", country } = body || {};
  const coupon = (await getCoupons()).find((c) => c.code === code && c.site === site);
  const result = validateCoupon(coupon, { country, site });
  return NextResponse.json({
    ...result,
    message: result.valid ? "Coupon applied." : REASON_TEXT[result.reason] || "This code isn't valid.",
  });
}
