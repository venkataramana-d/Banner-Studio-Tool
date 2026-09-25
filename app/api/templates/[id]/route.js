import { NextResponse } from "next/server";
import { deleteTemplate } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  await deleteTemplate(params.id);
  return NextResponse.json({ ok: true });
}
