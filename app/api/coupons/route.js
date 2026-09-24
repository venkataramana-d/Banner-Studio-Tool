import { NextResponse } from "next/server";
import { getCoupons } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ coupons: getCoupons() });
}
