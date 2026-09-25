import { NextResponse } from "next/server";
import { getTemplates, createTemplate } from "@/lib/store";
import { festivalByKey } from "@/lib/festivals";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ templates: await getTemplates() });
}

export async function POST(req) {
  let input;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (!input.festivalKey || !festivalByKey(input.festivalKey)) {
    return NextResponse.json({ error: "invalid_festival" }, { status: 400 });
  }
  const template = await createTemplate(input);
  return NextResponse.json({ template }, { status: 201 });
}
