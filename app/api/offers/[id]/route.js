import { NextResponse } from "next/server";
import { getOffer, updateOffer, deleteOffer } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const offer = getOffer(params.id);
  if (!offer) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ offer });
}

export async function PUT(req, { params }) {
  let patch;
  try { patch = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!patch || typeof patch !== "object") return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const offer = updateOffer(params.id, patch);
  if (!offer) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ offer });
}

export async function DELETE(_req, { params }) {
  deleteOffer(params.id);
  return NextResponse.json({ ok: true });
}
