import { NextResponse } from "next/server";
import { getOffers, createOffer } from "@/lib/store";
import { findConflicts } from "@/lib/logic";
import { buildOffer } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ offers: getOffers() });
}

export async function POST(req) {
  let input;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  // overlap check before creating (unless explicitly forced)
  try {
    const draft = buildOffer(input);
    const conflicts = findConflicts(draft, getOffers()).map((c) => ({ id: c.id, name: c.name, placeholder: c.placeholder }));
    if (conflicts.length && !input.force) {
      return NextResponse.json({ error: "overlap", conflicts }, { status: 409 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  const offer = createOffer(input);
  return NextResponse.json({ offer }, { status: 201 });
}
