import { NextResponse } from "next/server";
import { deleteBlackout } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(_req, { params }) {
  await deleteBlackout(params.id);
  return NextResponse.json({ ok: true });
}
