import { NextResponse } from "next/server";
import { getBlackouts, createBlackout } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ blackouts: await getBlackouts() });
}

export async function POST(req) {
  let input;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const okDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!input || !okDate(input.startDate) || !okDate(input.endDate) || input.endDate < input.startDate) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }
  const blackout = await createBlackout(input);
  return NextResponse.json({ blackout }, { status: 201 });
}
