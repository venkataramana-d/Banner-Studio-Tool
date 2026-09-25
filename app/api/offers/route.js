import { NextResponse } from "next/server";
import { getOffers, createOffer } from "@/lib/store";
import { findConflicts } from "@/lib/logic";
import { buildOffer } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ offers: await getOffers() });
}

export async function POST(req) {
  let input;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (input.countries != null && !Array.isArray(input.countries)) return NextResponse.json({ error: "invalid_countries" }, { status: 400 });
  // Enforce the approval gate at the API boundary: a newly created non-draft offer
  // is submitted for review, not published, unless it explicitly says otherwise.
  if (input.approval == null && input.status !== "draft") input.approval = "pending";
  // overlap check before creating (unless explicitly forced)
  try {
    const draft = buildOffer(input);
    const conflicts = findConflicts(draft, await getOffers()).map((c) => ({ id: c.id, name: c.name, placeholder: c.placeholder }));
    if (conflicts.length && !input.force) {
      return NextResponse.json({ error: "overlap", conflicts }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "invalid_offer" }, { status: 400 });
  }
  const offer = await createOffer(input);
  return NextResponse.json({ offer }, { status: 201 });
}
