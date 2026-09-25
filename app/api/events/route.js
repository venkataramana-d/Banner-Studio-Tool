import { NextResponse } from "next/server";
import { getEvents, recordEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

// Daily event rollups. GET returns all rows (the client filters by date range);
// POST ingests a single event and increments the current day's bucket.
export async function GET() {
  return NextResponse.json({ events: await getEvents() });
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const type = body?.type;
  if (!["impression", "click", "redemption"].includes(type) || !body?.offerId) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }
  await recordEvent({ type, offerId: body.offerId, country: body.country, placeholder: body.placeholder });
  return NextResponse.json({ ok: true });
}
