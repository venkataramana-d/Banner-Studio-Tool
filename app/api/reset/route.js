import { NextResponse } from "next/server";
import { resetStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await resetStore();
  return NextResponse.json({ ok: true });
}
